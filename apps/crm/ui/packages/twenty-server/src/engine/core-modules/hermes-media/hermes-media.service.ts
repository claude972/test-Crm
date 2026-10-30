import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { messagingId } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.policy';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { FileFolder } from 'kovaa-lab-shared/types';
import { DataSource, type EntityManager, IsNull } from 'typeorm';
import { FileStorageService } from 'src/engine/core-modules/file-storage/services/file-storage.service';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { FileUploadService } from 'src/engine/core-modules/file/file-upload/services/file-upload.service';
import { FileService } from 'src/engine/core-modules/file/services/file.service';
import { FILE_STATUS } from 'src/engine/core-modules/file/types/file-status.type';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesMessagingAccessService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-access.service';
import { type HermesMessagingActor } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { HermesMediaAssetEntity } from './hermes-media.entity';
import {
  HERMES_MEDIA_FORMATS,
  mediaMimeMatches,
  mediaScopeSchema,
  parseMedia,
  prepareMediaSchema,
  type HermesMediaScopeInput,
  type HermesPrepareMediaInput,
} from './hermes-media.policy';

@Injectable()
export class HermesMediaService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly access: HermesMessagingAccessService,
    private readonly uploads: FileUploadService,
    private readonly files: FileService,
    private readonly tokens: JwtWrapperService,
    private readonly nativeStorage: FileStorageService,
  ) {}

  private async conversation(
    actor: HermesMessagingActor,
    id: string,
    manager?: EntityManager,
  ) {
    await this.access.assertAllowed(actor, manager);
    const conversation = await (manager ?? this.dataSource)
      .getRepository(HermesConversationEntity)
      .findOneBy({ workspaceId: actor.workspaceId, id });
    if (!conversation) throw new NotFoundException('CONVERSATION_NOT_FOUND');
    if (!['WHATSAPP', 'EMAIL'].includes(conversation.channel))
      throw new BadRequestException('MEDIA_CHANNEL_UNSUPPORTED');
    return conversation;
  }

  async scoped(
    actor: HermesMessagingActor,
    raw: HermesMediaScopeInput,
    manager?: EntityManager,
    allowRevoked = false,
  ) {
    const input = parseMedia(mediaScopeSchema, raw);
    const conversation = await this.conversation(
      actor,
      input.conversationId,
      manager,
    );
    const asset = await (manager ?? this.dataSource)
      .getRepository(HermesMediaAssetEntity)
      .findOneBy({
        id: input.assetId,
        workspaceId: actor.workspaceId,
        conversationId: conversation.id,
        providerConnectionId: conversation.providerConnectionId,
      });
    await this.access.assertAllowed(actor, manager);
    if (
      !asset ||
      (asset.status === 'REVOKED' && !allowRevoked) ||
      (asset.status !== 'ATTACHED' &&
        asset.ownerUserWorkspaceId !== actor.userWorkspaceId)
    )
      throw new NotFoundException('MEDIA_ASSET_NOT_FOUND');
    if (asset.status === 'PENDING' && asset.expiresAt.getTime() <= Date.now())
      throw new ConflictException('MEDIA_UPLOAD_EXPIRED');
    return asset;
  }

  publicAsset(asset: HermesMediaAssetEntity) {
    return {
      id: asset.id,
      kind: asset.kind,
      filename: asset.filename,
      mimeType: asset.mimeType,
      size: asset.size,
      status: asset.status,
    };
  }

  async prepare(actor: HermesMessagingActor, raw: HermesPrepareMediaInput) {
    const input = parseMedia(prepareMediaSchema, raw);
    const conversation = await this.conversation(actor, input.conversationId);
    if (conversation.channel === 'WHATSAPP' && input.kind === 'FILE')
      throw new BadRequestException('MEDIA_CHANNEL_KIND_UNSUPPORTED');
    // Native quarantine/upload tokens, storage quotas and cleanup are retained.
    const target = await this.uploads.createFileUpload({
      workspaceId: actor.workspaceId,
      filename: input.filename,
      size: input.size,
      fileFolder: FileFolder.AgentChat,
    });
    const id = randomUUID();
    await this.dataSource.getRepository(HermesMediaAssetEntity).save({
      id,
      workspaceId: actor.workspaceId,
      conversationId: conversation.id,
      providerConnectionId: conversation.providerConnectionId,
      fileId: target.fileId,
      ownerUserWorkspaceId: actor.userWorkspaceId,
      kind: input.kind,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      status: 'PENDING',
      messageId: null,
      expiresAt: target.expiresAt,
    });
    await this.access.assertAllowed(actor);
    return {
      assetId: id,
      uploadUrl: target.uploadUrl,
      contentType: target.contentType,
      expiresAt: target.expiresAt,
    };
  }

  async finalize(actor: HermesMessagingActor, input: HermesMediaScopeInput) {
    const asset = await this.scoped(actor, input);
    if (asset.status === 'ATTACHED' || asset.status === 'READY')
      return this.publicAsset(asset);
    // Completion performs the native magic-byte sniff and quarantine promotion.
    // Its generic signed URL is deliberately discarded: reads use our revocable authenticated route.
    await this.uploads.completeFileUpload({
      workspaceId: actor.workspaceId,
      fileId: asset.fileId,
    });
    const file = await this.dataSource.getRepository(FileEntity).findOneBy({
      id: asset.fileId,
      workspaceId: actor.workspaceId,
      deletedAt: IsNull(),
      status: FILE_STATUS.UPLOADED,
    });
    if (
      !file ||
      !file.contentSha256 ||
      !mediaMimeMatches(asset.kind, asset.mimeType, file.mimeType) ||
      file.size !== asset.size ||
      !(HERMES_MEDIA_FORMATS[asset.kind].mimes as readonly string[]).includes(
        file.mimeType,
      )
    )
      throw new BadRequestException('MEDIA_CONTENT_MISMATCH');
    await this.access.assertAllowed(actor);
    const updated = await this.dataSource
      .getRepository(HermesMediaAssetEntity)
      .update(
        { id: asset.id, workspaceId: actor.workspaceId, status: 'PENDING' },
        {
          status: 'READY',
          contentSha256: file!.contentSha256,
          mimeType: file!.mimeType,
        },
      );
    if (!updated.affected)
      throw new ConflictException('MEDIA_UPLOAD_CANCELLED');
    return this.publicAsset({
      ...asset,
      status: 'READY',
      mimeType: file!.mimeType,
    });
  }

  async cancel(actor: HermesMessagingActor, input: HermesMediaScopeInput) {
    const asset = await this.scoped(actor, input, undefined, true);
    if (asset.status === 'REVOKED') {
      const file = await this.dataSource.getRepository(FileEntity).findOneBy({
        id: asset.fileId,
        workspaceId: actor.workspaceId,
        deletedAt: IsNull(),
      });
      if (file)
        await this.nativeStorage.deleteByFileId({
          workspaceId: actor.workspaceId,
          fileId: asset.fileId,
          fileFolder: FileFolder.AgentChat,
        });
      return true;
    }
    if (asset.status === 'ATTACHED')
      throw new ConflictException('MEDIA_ALREADY_SENT');
    await this.access.assertAllowed(actor);
    const result = await this.dataSource
      .getRepository(HermesMediaAssetEntity)
      .update(
        { id: asset.id, workspaceId: actor.workspaceId, status: asset.status },
        { status: 'REVOKED' },
      );
    if (!result.affected) throw new ConflictException('MEDIA_STATE_CHANGED');
    // Delete through the native write lock/quota bookkeeping. Revocation remains
    // durable even if storage cleanup fails; retry cancellation may clean it up.
    await this.nativeStorage.deleteByFileId({
      workspaceId: actor.workspaceId,
      fileId: asset.fileId,
      fileFolder: FileFolder.AgentChat,
    });
    return true;
  }

  async bind(
    actor: HermesMessagingActor,
    input: HermesMediaScopeInput,
    messageId: string,
    manager: EntityManager,
  ) {
    const asset = await this.scoped(actor, input, manager);
    if (asset.status !== 'READY')
      throw new ConflictException('MEDIA_NOT_READY');
    const result = await manager
      .getRepository(HermesMediaAssetEntity)
      .update(
        { id: asset.id, workspaceId: actor.workspaceId, status: 'READY' },
        { status: 'ATTACHED', messageId },
      );
    if (!result.affected) throw new ConflictException('MEDIA_ALREADY_USED');
    return asset;
  }

  async read(actor: HermesMessagingActor, input: HermesMediaScopeInput) {
    const asset = await this.scoped(actor, input);
    if (!['READY', 'ATTACHED'].includes(asset.status))
      throw new ConflictException('MEDIA_NOT_READY');
    // Reuse the native FILE token and key rotation; an authenticated session is ALSO required.
    const payload = {
      type: JwtTokenTypeEnum.FILE as const,
      sub: actor.workspaceId,
      workspaceId: actor.workspaceId,
      fileId: asset.id,
      userId: actor.userId,
      userWorkspaceId: actor.userWorkspaceId,
      purpose: 'hermes-media-read',
    };
    const token = await this.tokens.signAsyncOrThrow(payload, {
      expiresIn: 60,
    });
    await this.access.assertAllowed(actor);
    return {
      downloadPath: `/hermes-media/${asset.id}?conversationId=${asset.conversationId}&token=${encodeURIComponent(token)}`,
      expiresAt: new Date(Date.now() + 60_000),
    };
  }

  async open(
    actor: HermesMessagingActor,
    input: HermesMediaScopeInput,
    token: string,
  ) {
    let payload: Record<string, unknown>;
    try {
      payload = await this.tokens.verifyJwtToken(token);
    } catch {
      throw new ForbiddenException('MEDIA_READ_TOKEN_INVALID');
    }
    if (
      payload.type !== JwtTokenTypeEnum.FILE ||
      payload.purpose !== 'hermes-media-read' ||
      payload.workspaceId !== actor.workspaceId ||
      payload.fileId !== input.assetId ||
      payload.userId !== actor.userId ||
      payload.userWorkspaceId !== actor.userWorkspaceId
    )
      throw new ForbiddenException('MEDIA_READ_TOKEN_INVALID');
    return this.openScoped(actor, input);
  }

  async openScoped(actor: HermesMessagingActor, input: HermesMediaScopeInput) {
    const asset = await this.scoped(actor, input);
    if (!['READY', 'ATTACHED'].includes(asset.status))
      throw new ConflictException('MEDIA_NOT_READY');
    const file = await this.files.getFileStreamById({
      workspaceId: actor.workspaceId,
      fileId: asset.fileId,
      allowedFileFolders: [FileFolder.AgentChat],
    });
    if (!file || file.mimeType !== asset.mimeType)
      throw new NotFoundException('MEDIA_FILE_NOT_FOUND');
    try {
      await this.access.assertAllowed(actor);
    } catch (error) {
      file.stream.destroy();
      throw error;
    }
    return { ...file, asset };
  }

  async bytes(
    actor: HermesMessagingActor,
    input: HermesMediaScopeInput,
  ): Promise<{ bytes: Buffer; asset: HermesMediaAssetEntity }> {
    const { stream, asset } = await this.openScoped(actor, input);
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > HERMES_MEDIA_FORMATS[asset.kind].max || size > asset.size)
          throw new BadRequestException('MEDIA_SIZE_EXCEEDED');
        chunks.push(buffer);
      }
    } finally {
      stream.destroy();
    }
    if (
      createHash('sha256').update(Buffer.concat(chunks)).digest('hex') !==
      asset.contentSha256
    )
      throw new BadRequestException('MEDIA_CONTENT_CHANGED');
    if (size !== asset.size)
      throw new BadRequestException('MEDIA_SIZE_MISMATCH');
    await this.access.assertAllowed(actor);
    return { bytes: Buffer.concat(chunks), asset };
  }

  // Mail forwarding must copy bytes after checking BOTH scopes. Reusing an
  // asset ID from another conversation is never a supported attach operation.
  async cloneForConversation(
    actor: HermesMessagingActor,
    input: {
      sourceConversationId: string;
      sourceAssetId: string;
      targetConversationId: string;
    },
  ) {
    const source = await this.bytes(actor, {
      conversationId: input.sourceConversationId,
      assetId: input.sourceAssetId,
    });
    await this.conversation(actor, input.targetConversationId);
    const target = await this.prepare(actor, {
      conversationId: input.targetConversationId,
      kind: source.asset.kind,
      filename: source.asset.filename,
      mimeType: source.asset.mimeType,
      size: source.bytes.length,
    });
    const asset = await this.scoped(actor, {
      conversationId: input.targetConversationId,
      assetId: target.assetId,
    });
    await this.access.assertAllowed(actor);
    await this.uploads.receiveFileStream({
      workspaceId: actor.workspaceId,
      fileId: asset.fileId,
      stream: Readable.from(source.bytes),
    });
    return this.finalize(actor, {
      conversationId: input.targetConversationId,
      assetId: asset.id,
    });
  }

  // Internal provider ingress only; the receiver has already authenticated the workspace.
  async receive(
    input: {
      workspaceId: string;
      conversationId: string;
      providerConnectionId: string;
      providerMessageId: string;
      kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
      filename?: string;
      mimeType: string;
      bytes: Buffer;
    },
    options: { assertLive?: (manager?: EntityManager) => Promise<void> } = {},
  ) {
    const format = HERMES_MEDIA_FORMATS[input.kind];
    if (
      !input.bytes.length ||
      input.bytes.length > format.max ||
      !(format.mimes as readonly string[]).includes(input.mimeType)
    )
      throw new BadRequestException('MEDIA_CONTENT_UNSUPPORTED');
    const contentSha256 = createHash('sha256')
      .update(input.bytes)
      .digest('hex');
    const id = messagingId(
      input.workspaceId,
      input.providerConnectionId,
      'media',
      input.providerMessageId,
    );
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`hermes-media:${id}`],
      );
      await options.assertLive?.(manager);
      const workspace = await manager.getRepository(WorkspaceEntity).findOneBy({
        id: input.workspaceId,
        deletedAt: IsNull(),
        activationStatus: WorkspaceActivationStatus.ACTIVE,
      });
      if (!workspace)
        throw new NotFoundException('MESSAGING_WORKSPACE_UNAVAILABLE');
      const assets = manager.getRepository(HermesMediaAssetEntity);
      const existing = await assets.findOneBy({
        id,
        workspaceId: input.workspaceId,
      });
      await options.assertLive?.(manager);
      if (existing) {
        if (
          existing.conversationId !== input.conversationId ||
          existing.providerConnectionId !== input.providerConnectionId ||
          existing.kind !== input.kind ||
          !mediaMimeMatches(input.kind, input.mimeType, existing.mimeType) ||
          existing.size !== input.bytes.length ||
          existing.contentSha256 !== contentSha256 ||
          existing.status !== 'ATTACHED'
        )
          throw new ConflictException('PROVIDER_MEDIA_CONFLICT');
        return { assetId: id };
      }
      const ext = (
        {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'video/mp4': 'mp4',
          'audio/ogg': 'ogg',
          'audio/opus': 'opus',
          'audio/mpeg': 'mp3',
          'audio/mp4': 'm4a',
          'audio/webm': 'webm',
          'video/webm': 'webm',
          'application/pdf': 'pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            'docx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            'xlsx',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            'pptx',
        } as Record<string, string>
      )[input.mimeType];
      const filename = input.filename ?? `media.${ext}`;
      parseMedia(prepareMediaSchema, {
        conversationId: input.conversationId,
        kind: input.kind,
        filename,
        mimeType: input.mimeType,
        size: input.bytes.length,
      });
      await options.assertLive?.(manager);
      const target = await this.uploads.createFileUpload({
        workspaceId: input.workspaceId,
        filename,
        size: input.bytes.length,
        fileFolder: FileFolder.AgentChat,
      });
      await options.assertLive?.(manager);
      await this.uploads.receiveFileStream({
        workspaceId: input.workspaceId,
        fileId: target.fileId,
        stream: Readable.from(input.bytes),
      });
      await options.assertLive?.(manager);
      await this.uploads.completeFileUpload({
        workspaceId: input.workspaceId,
        fileId: target.fileId,
      });
      await options.assertLive?.(manager);
      const file = await manager.getRepository(FileEntity).findOneBy({
        id: target.fileId,
        workspaceId: input.workspaceId,
        status: FILE_STATUS.UPLOADED,
        deletedAt: IsNull(),
      });
      if (
        !file ||
        !mediaMimeMatches(input.kind, input.mimeType, file.mimeType) ||
        file.size !== input.bytes.length ||
        file.contentSha256 !== contentSha256
      )
        throw new BadRequestException('MEDIA_CONTENT_MISMATCH');
      await options.assertLive?.(manager);
      await assets.save({
        id,
        workspaceId: input.workspaceId,
        conversationId: input.conversationId,
        providerConnectionId: input.providerConnectionId,
        fileId: target.fileId,
        ownerUserWorkspaceId: null,
        kind: input.kind,
        filename,
        mimeType: file.mimeType,
        size: input.bytes.length,
        status: 'ATTACHED',
        messageId: null,
        contentSha256,
        expiresAt: new Date(),
      });
      await options.assertLive?.(manager);
      return { assetId: id };
    });
  }

  async digest(
    workspaceId: string,
    assetId: string,
    conversationId: string,
    providerConnectionId: string,
  ) {
    const asset = await this.dataSource
      .getRepository(HermesMediaAssetEntity)
      .findOneBy({
        workspaceId,
        id: assetId,
        conversationId,
        providerConnectionId,
        status: 'ATTACHED',
      });
    if (!asset?.contentSha256)
      throw new BadRequestException('MEDIA_ASSET_NOT_FOUND');
    return asset.contentSha256;
  }

  async attachment(
    workspaceId: string,
    assetId: string,
    conversationId: string,
  ) {
    const asset = await this.dataSource
      .getRepository(HermesMediaAssetEntity)
      .findOneBy({
        workspaceId,
        id: assetId,
        conversationId,
        status: 'ATTACHED',
      });
    return asset ? [this.publicAsset(asset)] : [];
  }
}
