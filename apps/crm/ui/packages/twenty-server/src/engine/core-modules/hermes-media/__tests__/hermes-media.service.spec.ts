import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { type DataSource } from 'typeorm';
import { HermesMediaService } from '../hermes-media.service';
import { HermesMediaAssetEntity } from '../hermes-media.entity';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';

jest.mock(
  'src/engine/core-modules/file-storage/services/file-storage.service',
  () => ({ FileStorageService: class {} }),
);
jest.mock(
  'src/engine/core-modules/file/file-upload/services/file-upload.service',
  () => ({ FileUploadService: class {} }),
);
jest.mock('src/engine/core-modules/file/services/file.service', () => ({
  FileService: class {},
}));
jest.mock('src/engine/core-modules/jwt/services/jwt-wrapper.service', () => ({
  JwtWrapperService: class {},
}));
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));
jest.mock('src/engine/core-modules/file/entities/file.entity', () => ({
  FileEntity: class {},
}));
jest.mock(
  'src/engine/core-modules/hermes-messaging/hermes-messaging-access.service',
  () => ({ HermesMessagingAccessService: class {} }),
);

const actor = {
  workspaceId: randomUUID(),
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const conversationId = randomUUID(),
  otherConversation = randomUUID(),
  fileId = randomUUID();
const bytes = Buffer.from('isolated fixture');
const hash = createHash('sha256').update(bytes).digest('hex');
function harness() {
  let asset: Record<string, unknown> | undefined;
  const conversation = {
    id: conversationId,
    workspaceId: actor.workspaceId,
    channel: 'WHATSAPP',
    providerConnectionId: 'evolution:fixture',
  };
  const matches = (
    row: Record<string, unknown> | undefined,
    where: Record<string, unknown>,
  ) =>
    row &&
    Object.entries(where).every(
      ([key, value]) => typeof value === 'object' || row[key] === value,
    );
  const assets = {
    save: jest.fn(async (value) => {
      asset = { ...value };
      return asset;
    }),
    findOneBy: jest.fn(async (where) =>
      matches(asset, where) ? { ...asset } : null,
    ),
    update: jest.fn(async (where, patch) => {
      if (!matches(asset, where)) return { affected: 0 };
      asset = { ...asset, ...patch };
      return { affected: 1 };
    }),
  };
  const files = {
    findOneBy: jest.fn(async () => ({
      id: fileId,
      workspaceId: actor.workspaceId,
      mimeType: 'image/png',
      size: bytes.length,
      contentSha256: hash,
    })),
  };
  const conversations = {
    findOneBy: jest.fn(async (where) =>
      matches(conversation, where) ? conversation : null,
    ),
  };
  const source = {
    getRepository: (target: unknown) =>
      target === HermesMediaAssetEntity
        ? assets
        : target === FileEntity
          ? files
          : target === HermesConversationEntity
            ? conversations
            : { findOneBy: async () => ({ id: actor.workspaceId }) },
    transaction: async (work: Function) =>
      work({ getRepository: source.getRepository, query: async () => [] }),
  };
  const access = { assertAllowed: jest.fn(async () => {}) };
  const uploads = {
    createFileUpload: jest.fn(async () => ({
      fileId,
      uploadUrl: '/native-quarantine-target',
      contentType: 'application/octet-stream',
      expiresAt: new Date(Date.now() + 60_000),
    })),
    completeFileUpload: jest.fn(async () => ({
      id: fileId,
      signedUrl: 'must-not-escape',
    })),
    receiveFileStream: jest.fn(async () => {}),
  };
  const storage = {
    getFileStreamById: jest.fn(async () => ({
      stream: Readable.from(bytes),
      mimeType: 'image/png',
    })),
  };
  const tokens = {
    signAsyncOrThrow: jest.fn(async () => 'native-file-token'),
    verifyJwtToken: jest.fn(async () => ({
      type: JwtTokenTypeEnum.FILE,
      purpose: 'hermes-media-read',
      workspaceId: actor.workspaceId,
      fileId: asset?.id,
      userId: actor.userId,
      userWorkspaceId: actor.userWorkspaceId,
    })),
  };
  const service = new HermesMediaService(
    source as unknown as DataSource,
    access as never,
    uploads as never,
    storage as never,
    tokens as never,
    { deleteByFileId: jest.fn(async () => {}) } as never,
  );
  const prepare = () =>
    service.prepare(actor, {
      conversationId,
      kind: 'IMAGE',
      filename: 'photo.png',
      mimeType: 'image/png',
      size: bytes.length,
    });
  return {
    service,
    source,
    prepare,
    access,
    uploads,
    storage,
    tokens,
    files,
    assets,
    get asset() {
      return asset!;
    },
  };
}

describe('Hermes media authorization, quarantine and revocation', () => {
  it('refuses executable formats, MIME confusion, path traversal and per-kind oversize before storage', async () => {
    const h = harness();
    for (const input of [
      { filename: 'x.svg', mimeType: 'image/svg+xml', size: 20 },
      { filename: '../x.png', mimeType: 'image/png', size: 20 },
      { filename: 'x.png', mimeType: 'image/png', size: 5 * 1024 * 1024 + 1 },
      { filename: 'x.html', mimeType: 'text/html', size: 20 },
    ])
      await expect(
        h.service.prepare(actor, { conversationId, kind: 'IMAGE', ...input }),
      ).rejects.toThrow('INVALID_MEDIA_INPUT');
    expect(h.uploads.createFileUpload).not.toHaveBeenCalled();
  });
  it('returns only the native upload target, then finalizes after native sniff/size checks', async () => {
    const h = harness();
    const target = await h.prepare();
    expect(target).not.toHaveProperty('fileId');
    expect(target).not.toHaveProperty('signedUrl');
    const result = await h.service.finalize(actor, {
      conversationId,
      assetId: target.assetId,
    });
    expect(result).toMatchObject({
      id: target.assetId,
      status: 'READY',
      mimeType: 'image/png',
    });
    expect(result).not.toHaveProperty('fileId');
    expect(result).not.toHaveProperty('workspaceId');
    expect(h.uploads.completeFileUpload).toHaveBeenCalledWith({
      workspaceId: actor.workspaceId,
      fileId,
    });
    expect(h.asset.contentSha256).toBe(hash);
  });
  it('keeps native WebM detection authoritative for audio-only MediaRecorder containers', async () => {
    const h = harness();
    const target = await h.service.prepare(actor, {
      conversationId,
      kind: 'AUDIO',
      filename: 'voice.webm',
      mimeType: 'audio/webm',
      size: bytes.length,
    });
    h.files.findOneBy.mockResolvedValueOnce({
      id: fileId,
      workspaceId: actor.workspaceId,
      mimeType: 'video/webm',
      size: bytes.length,
      contentSha256: hash,
    });
    const result = await h.service.finalize(actor, {
      conversationId,
      assetId: target.assetId,
    });
    expect(result).toMatchObject({
      kind: 'AUDIO',
      mimeType: 'video/webm',
      status: 'READY',
    });
    expect(h.asset.mimeType).toBe('video/webm');
  });
  it('does not promote MIME-mismatched content or bytes with a changed size', async () => {
    for (const patch of [
      { mimeType: 'text/html' },
      { size: bytes.length + 1 },
    ]) {
      const h = harness();
      const target = await h.prepare();
      h.files.findOneBy.mockResolvedValueOnce({
        id: fileId,
        workspaceId: actor.workspaceId,
        mimeType: 'image/png',
        size: bytes.length,
        contentSha256: hash,
        ...patch,
      });
      await expect(
        h.service.finalize(actor, { conversationId, assetId: target.assetId }),
      ).rejects.toThrow('MEDIA_CONTENT_MISMATCH');
      expect(h.asset.status).toBe('PENDING');
    }
  });
  it('blocks wrong workspace, wrong conversation, changed connection and another composer owner', async () => {
    const h = harness();
    const target = await h.prepare();
    const input = { conversationId, assetId: target.assetId };
    await expect(
      h.service.scoped({ ...actor, workspaceId: randomUUID() }, input),
    ).rejects.toThrow('CONVERSATION_NOT_FOUND');
    await expect(
      h.service.scoped(actor, { ...input, conversationId: otherConversation }),
    ).rejects.toThrow('CONVERSATION_NOT_FOUND');
    await expect(
      h.service.scoped({ ...actor, userWorkspaceId: randomUUID() }, input),
    ).rejects.toThrow('MEDIA_ASSET_NOT_FOUND');
    h.asset.providerConnectionId = 'evolution:changed';
    await expect(h.service.scoped(actor, input)).rejects.toThrow(
      'MEDIA_ASSET_NOT_FOUND',
    );
  });
  it('cancellation racing with completion wins and cannot become sendable', async () => {
    const h = harness();
    const target = await h.prepare();
    const input = { conversationId, assetId: target.assetId };
    h.uploads.completeFileUpload.mockImplementationOnce(async () => {
      await h.service.cancel(actor, input);
      return { id: fileId, signedUrl: '' };
    });
    await expect(h.service.finalize(actor, input)).rejects.toThrow(
      'MEDIA_UPLOAD_CANCELLED',
    );
    expect(h.asset.status).toBe('REVOKED');
    await expect(h.service.scoped(actor, input)).rejects.toThrow(
      'MEDIA_ASSET_NOT_FOUND',
    );
  });
  it('binds once in the durable send transaction, allowing attached reads only within the original scope', async () => {
    const h = harness();
    const target = await h.prepare();
    const input = { conversationId, assetId: target.assetId };
    await h.service.finalize(actor, input);
    await h.service.bind(actor, input, randomUUID(), {
      getRepository: h.source.getRepository,
    } as never);
    await expect(
      h.service.bind(actor, input, randomUUID(), {
        getRepository: h.source.getRepository,
      } as never),
    ).rejects.toThrow('MEDIA_NOT_READY');
    await expect(h.service.cancel(actor, input)).rejects.toThrow(
      'MEDIA_ALREADY_SENT',
    );
    expect(h.asset.status).toBe('ATTACHED');
  });
  it('uses a 60s native FILE token plus current authenticated membership, never a generic signed file URL', async () => {
    const h = harness();
    const target = await h.prepare();
    const input = { conversationId, assetId: target.assetId };
    await h.service.finalize(actor, input);
    const read = await h.service.read(actor, input);
    expect(read.downloadPath).toBe(
      `/hermes-media/${target.assetId}?conversationId=${conversationId}&token=native-file-token`,
    );
    expect(h.tokens.signAsyncOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: JwtTokenTypeEnum.FILE,
        fileId: target.assetId,
        userWorkspaceId: actor.userWorkspaceId,
      }),
      { expiresIn: 60 },
    );
    const result = await h.service.open(actor, input, 'native-file-token');
    result.stream.destroy();
    h.access.assertAllowed.mockRejectedValueOnce(new Error('REVOKED_ROLE'));
    await expect(
      h.service.open(actor, input, 'native-file-token'),
    ).rejects.toThrow('REVOKED_ROLE');
    h.tokens.verifyJwtToken.mockResolvedValueOnce({
      type: JwtTokenTypeEnum.FILE,
      purpose: 'hermes-media-read',
      workspaceId: actor.workspaceId,
      fileId: target.assetId,
      userId: randomUUID(),
      userWorkspaceId: actor.userWorkspaceId,
    });
    await expect(
      h.service.open(actor, input, 'native-file-token'),
    ).rejects.toThrow('MEDIA_READ_TOKEN_INVALID');
  });
  it('checks the persisted content digest before returning bytes to the provider', async () => {
    const h = harness();
    const target = await h.prepare();
    const input = { conversationId, assetId: target.assetId };
    await h.service.finalize(actor, input);
    expect((await h.service.bytes(actor, input)).bytes).toEqual(bytes);
    h.asset.contentSha256 = '0'.repeat(64);
    await expect(h.service.bytes(actor, input)).rejects.toThrow(
      'MEDIA_CONTENT_CHANGED',
    );
  });
  it('does not disclose a stream when access is revoked during storage lookup', async () => {
    const h = harness();
    const target = await h.prepare();
    const input = { conversationId, assetId: target.assetId };
    await h.service.finalize(actor, input);
    const stream = Readable.from(bytes);
    h.storage.getFileStreamById.mockImplementationOnce(async () => {
      h.access.assertAllowed.mockRejectedValueOnce(new Error('REVOKED_ROLE'));
      return { stream, mimeType: 'image/png' };
    });
    await expect(h.service.openScoped(actor, input)).rejects.toThrow(
      'REVOKED_ROLE',
    );
    expect(stream.destroyed).toBe(true);
  });
});

describe('server-only media ingress snapshot boundary', () => {
  it('stops after native bytes were awaited if the connection or deadline was revoked', async () => {
    const h = harness();
    let live = true;
    let seenManager: unknown;
    h.uploads.receiveFileStream.mockImplementation(async () => {
      live = false;
    });
    const assertLive = jest.fn(async (manager?: unknown) => {
      if (seenManager) expect(manager).toBe(seenManager);
      else seenManager = manager;
      if (!live) throw new Error('CONNECTION_OR_DEADLINE_REVOKED');
    });
    await expect(
      h.service.receive(
        {
          workspaceId: actor.workspaceId,
          conversationId,
          providerConnectionId: 'evolution:fixture',
          providerMessageId: 'guarded-inbound',
          kind: 'IMAGE',
          mimeType: 'image/png',
          bytes,
        },
        { assertLive },
      ),
    ).rejects.toThrow('CONNECTION_OR_DEADLINE_REVOKED');
    expect(h.uploads.completeFileUpload).not.toHaveBeenCalled();
    expect(h.assets.save).not.toHaveBeenCalled();
    expect(assertLive).toHaveBeenCalled();
  });
  it('rejects a stale snapshot before allocating any native file', async () => {
    const h = harness();
    const assertLive = jest.fn(async () => {
      throw new Error('CONNECTION_REVOKED');
    });
    await expect(
      h.service.receive(
        {
          workspaceId: actor.workspaceId,
          conversationId,
          providerConnectionId: 'evolution:fixture',
          providerMessageId: 'guarded-inbound',
          kind: 'IMAGE',
          mimeType: 'image/png',
          bytes,
        },
        { assertLive },
      ),
    ).rejects.toThrow('CONNECTION_REVOKED');
    expect(h.uploads.createFileUpload).not.toHaveBeenCalled();
    expect(h.assets.save).not.toHaveBeenCalled();
  });
});
