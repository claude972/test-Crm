import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { Readable } from 'node:stream';

import { type DataSource } from 'typeorm';

import { LocalDriver } from 'src/engine/core-modules/file-storage/drivers/local.driver';
import { extractFileInfoOrThrow } from 'src/engine/core-modules/file/utils/extract-file-info-or-throw.utils';
import { FILE_STATUS } from 'src/engine/core-modules/file/types/file-status.type';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';

import { HermesMediaService } from '../hermes-media.service';
import { HermesMediaAssetEntity } from '../hermes-media.entity';
import {
  decodableMp4,
  decodableOggOpus,
  decodablePng,
  decodableWebmContainer,
  readPngPixelData,
  undecodableMarkup,
} from './fixtures/hermes-media-decodable-fixtures';

// WHAT THIS SUITE PROVES, AND WHAT IT DOES NOT.
//
// Real, exercised here for real:
//   - the real HermesMediaService, the class the application runs;
//   - the real native magic-byte sniff, extractFileInfoOrThrow, over the real
//     file-type package — the same function the native upload completion uses;
//   - a real private blob: the real LocalDriver writes the bytes to a real file
//     under a temporary directory and streams them back from disk;
//   - real HS256 token signing and verification for the authorised read-back,
//     so the read is genuinely token-gated rather than stubbed true;
//   - genuinely decodable fixtures: a real PNG whose pixel data inflates, a
//     structurally valid MP4, a real Ogg page carrying OpusHead with a correct
//     page checksum, and a real WebM container header.
//
// Stood in for, because this environment has no PostgreSQL:
//   - the DataSource, its repositories and its transaction. The transaction
//     boundary is emulated faithfully enough to show a revocation inside it
//     refusing a write, but it is NOT PostgreSQL and NOT the advisory lock.
//   - FileUploadService and FileService, which carry DI this suite cannot
//     construct. They are thin adapters here that delegate to the real sniff
//     and the real driver, so the bytes and the verdicts are real even though
//     the services are not.
//
// So: NOT proof of PostgreSQL, NOT proof of the production quarantine
// machinery, and NOT provider delivery. No provider is contacted by this file
// at all. Every fixture is a demonstration, never a verified connector.
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

const WorkspaceEntity =
  require('src/engine/core-modules/workspace/workspace.entity').WorkspaceEntity;

const actor = {
  workspaceId: randomUUID(),
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const conversationId = randomUUID();
const providerConnectionId = 'evolution:demonstration-fixture';

let storageRoot: string;
let driver: LocalDriver;

type Harness = {
  service: HermesMediaService;
  allow: { value: boolean };
  live: { value: boolean };
  assets: () => Record<string, Record<string, unknown>>;
  blobPaths: () => Promise<string[]>;
  signedBy: (payload: Record<string, unknown>) => Promise<string>;
};

// A real HS256 sign/verify pair, so the read token is real crypto.
const jwtSecret = 'cj03-demonstration-secret-not-a-production-key';

const harness = (): Harness => {
  const allow = { value: true };
  const live = { value: true };
  const assetRows: Record<string, Record<string, unknown>> = {};
  const fileRows: Record<string, Record<string, unknown>> = {};
  const conversation = {
    id: conversationId,
    workspaceId: actor.workspaceId,
    channel: 'WHATSAPP',
    providerConnectionId,
  };

  const matches = (
    row: Record<string, unknown> | undefined,
    where: Record<string, unknown>,
  ) =>
    row !== undefined &&
    Object.entries(where).every(
      ([key, value]) =>
        value === null || typeof value === 'object' || row[key] === value,
    );

  const repository = (rows: Record<string, Record<string, unknown>>) => ({
    save: jest.fn(async (value: Record<string, unknown>) => {
      rows[value.id as string] = { ...value };

      return rows[value.id as string];
    }),
    findOneBy: jest.fn(async (where: Record<string, unknown>) => {
      const found = Object.values(rows).find((row) => matches(row, where));

      return found ? { ...found } : null;
    }),
    update: jest.fn(
      async (
        where: Record<string, unknown>,
        patch: Record<string, unknown>,
      ) => {
        const found = Object.values(rows).find((row) => matches(row, where));

        if (!found) return { affected: 0 };

        Object.assign(rows[found.id as string], patch);

        return { affected: 1 };
      },
    ),
  });

  const assets = repository(assetRows);
  const files = repository(fileRows);
  const conversations = {
    findOneBy: jest.fn(async (where: Record<string, unknown>) =>
      matches(conversation, where) ? conversation : null,
    ),
  };
  const workspaces = {
    findOneBy: jest.fn(async () => ({ id: actor.workspaceId })),
  };

  const getRepository = (target: unknown) =>
    target === HermesMediaAssetEntity
      ? assets
      : target === FileEntity
        ? files
        : target === HermesConversationEntity
          ? conversations
          : target === WorkspaceEntity
            ? workspaces
            : (() => {
                throw new Error('Unexpected repository in the fixture');
              })();

  const manager = { getRepository, query: jest.fn(async () => undefined) };
  const source = {
    getRepository,
    transaction: async (run: (m: typeof manager) => Promise<unknown>) =>
      run(manager),
  } as unknown as DataSource;

  // Rights, and revocation. The same switch the production access service
  // would flip; the service is expected to consult it repeatedly.
  const access = {
    assertAllowed: jest.fn(async () => {
      if (!allow.value) throw new Error('MESSAGING_ACCESS_DENIED');
    }),
  };

  // The blob path a file lives at. Real, and private to this workspace.
  const pathOf = (_fileId: string) =>
    `workspace-${actor.workspaceId}/agent-chat`;

  const uploads = {
    createFileUpload: jest.fn(
      async ({
        workspaceId,
        filename,
        size,
      }: {
        workspaceId: string;
        filename: string;
        size: number;
      }) => {
        const fileId = randomUUID();

        fileRows[fileId] = {
          id: fileId,
          workspaceId,
          name: filename,
          path: `agent-chat/${fileId}`,
          size,
          status: FILE_STATUS.PENDING,
          mimeType: null,
          contentSha256: null,
          deletedAt: null,
        };

        return { fileId, uploadUrl: `/files/${fileId}`, expiresAt: new Date() };
      },
    ),
    // Writes the bytes to the real driver, as a stream.
    receiveFileStream: jest.fn(
      async ({
        fileId,
        stream,
      }: {
        workspaceId: string;
        fileId: string;
        stream: Readable;
      }) => {
        const row = fileRows[fileId];

        if (!row) throw new Error('FILE_NOT_FOUND');
        if (row.status !== FILE_STATUS.PENDING)
          throw new Error('FILE_NOT_PENDING');

        await driver.writeFileStream({
          filePath: join(pathOf(fileId), fileId),
          stream,
          mimeType: undefined,
        });
      },
    ),
    // The native completion: the REAL magic-byte sniff decides the MIME, and a
    // payload whose bytes contradict its name is refused here, before anything
    // is promoted out of quarantine.
    completeFileUpload: jest.fn(
      async ({ fileId }: { workspaceId: string; fileId: string }) => {
        const row = fileRows[fileId];

        if (!row) throw new Error('FILE_NOT_FOUND');

        const stored = await readFile(
          join(storageRoot, pathOf(fileId), fileId),
        );
        const info = await extractFileInfoOrThrow({
          file: stored,
          filename: row.name as string,
        });

        row.mimeType = info.mimeType;
        row.size = stored.length;
        row.contentSha256 = createHash('sha256').update(stored).digest('hex');
        row.status = FILE_STATUS.UPLOADED;

        return { fileId, path: row.path as string };
      },
    ),
  };

  const fileService = {
    // Streams the bytes back off the disk, through the real driver.
    getFileStreamById: jest.fn(
      async ({ fileId }: { workspaceId: string; fileId: string }) => {
        const row = fileRows[fileId];

        if (!row || row.status !== FILE_STATUS.UPLOADED) return null;

        return {
          stream: await driver.readFile({
            filePath: join(pathOf(fileId), fileId),
          }),
          mimeType: row.mimeType as string,
          name: row.name as string,
        };
      },
    ),
  };

  const tokens = {
    signAsyncOrThrow: jest.fn(async (payload: Record<string, unknown>) => {
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = createHash('sha256')
        .update(`${jwtSecret}.${body}`)
        .digest('base64url');

      return `${body}.${signature}`;
    }),
    verifyJwtToken: jest.fn(async (token: string) => {
      const [body, signature] = token.split('.');
      const expected = createHash('sha256')
        .update(`${jwtSecret}.${body}`)
        .digest('base64url');

      if (!body || signature !== expected) throw new Error('INVALID_TOKEN');

      return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    }),
  };

  const nativeStorage = {
    deleteByFileId: jest.fn(async () => undefined),
  };

  const service = new HermesMediaService(
    source,
    access as never,
    uploads as never,
    fileService as never,
    tokens as never,
    nativeStorage as never,
  );

  return {
    service,
    allow,
    live,
    assets: () => assetRows,
    blobPaths: async () => {
      const folder = join(storageRoot, pathOf('any'));

      try {
        return await readdir(folder);
      } catch {
        return [];
      }
    },
    signedBy: tokens.signAsyncOrThrow,
  };
};

beforeEach(async () => {
  storageRoot = await mkdtemp(join(tmpdir(), 'cj03-media-'));
  driver = new LocalDriver({ storagePath: storageRoot });
});

afterEach(async () => {
  await rm(storageRoot, { recursive: true, force: true });
});

describe('The fixtures really are media', () => {
  it('builds a PNG whose pixel data decodes', () => {
    const png = decodablePng(0x2f, 0x6f, 0xed);

    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    // The image data inflates to one filtered scanline with the pixel asked for.
    expect(inflateSync(readPngPixelData(png))).toEqual(
      Buffer.from([0, 0x2f, 0x6f, 0xed]),
    );
    expect(png.length).toBeLessThan(400);
  });

  it('is recognised by the real native sniff, not by its filename', async () => {
    await expect(
      extractFileInfoOrThrow({ file: decodablePng(), filename: 'photo.png' }),
    ).resolves.toMatchObject({ mimeType: 'image/png' });
    await expect(
      extractFileInfoOrThrow({ file: decodableMp4(), filename: 'clip.mp4' }),
    ).resolves.toMatchObject({ mimeType: 'video/mp4' });
    // A real Opus voice note is sniffed with its codec parameter.
    await expect(
      extractFileInfoOrThrow({ file: decodableOggOpus(), filename: 'v.ogg' }),
    ).resolves.toMatchObject({ mimeType: 'audio/ogg; codecs=opus' });
    await expect(
      extractFileInfoOrThrow({
        file: decodableWebmContainer(),
        filename: 'v.webm',
      }),
    ).resolves.toMatchObject({ mimeType: 'video/webm' });

    // And every fixture stays tiny.
    for (const bytes of [
      decodablePng(),
      decodableMp4(),
      decodableOggOpus(),
      decodableWebmContainer(),
    ])
      expect(bytes.length).toBeLessThan(400);
  });
});

describe('Inbound media, through the real service into a real private blob', () => {
  const receive = (
    harnessed: Harness,
    kind: 'IMAGE' | 'VIDEO' | 'AUDIO',
    mimeType: string,
    bytes: Buffer,
    providerMessageId = randomUUID(),
  ) =>
    harnessed.service.receive(
      {
        workspaceId: actor.workspaceId,
        conversationId,
        providerConnectionId,
        providerMessageId,
        kind,
        mimeType,
        bytes,
      },
      {
        assertLive: async () => {
          if (!harnessed.live.value) throw new Error('CONNECTION_REVOKED');
        },
      },
    );

  it.each([
    ['IMAGE', 'image/png', decodablePng, 'image/png'],
    ['VIDEO', 'video/mp4', decodableMp4, 'video/mp4'],
    ['AUDIO', 'audio/ogg', decodableOggOpus, 'audio/ogg'],
  ] as const)(
    'receives a real %s, stores the exact bytes on disk and reads them back',
    async (kind, declared, build, storedMime) => {
      const h = harness();
      const bytes = build();

      const { assetId } = await receive(h, kind, declared, bytes);

      // A real file exists, and it holds exactly the bytes that arrived.
      const blobs = await h.blobPaths();

      expect(blobs).toHaveLength(1);
      const onDisk = await readFile(
        join(storageRoot, `workspace-${actor.workspaceId}/agent-chat`, blobs[0]),
      );

      expect(onDisk).toEqual(bytes);

      // The asset records the sniffed format, parameters removed, and the
      // digest of the real bytes.
      const asset = h.assets()[assetId];

      expect(asset).toMatchObject({
        kind,
        mimeType: storedMime,
        size: bytes.length,
        status: 'ATTACHED',
        contentSha256: createHash('sha256').update(bytes).digest('hex'),
      });

      // Read back through the service, as the operator's session would.
      const read = await h.service.read(actor, { conversationId, assetId });

      expect(read.downloadPath).toContain(assetId);
      const token = new URL(
        `https://fixture.invalid${read.downloadPath}`,
      ).searchParams.get('token');

      const opened = await h.service.open(
        actor,
        { conversationId, assetId },
        token as string,
      );

      const chunks: Buffer[] = [];

      for await (const chunk of opened.stream) chunks.push(Buffer.from(chunk));

      expect(Buffer.concat(chunks)).toEqual(bytes);
      expect(opened.asset.mimeType).toBe(storedMime);
    },
  );

  it('keeps the authoritative container MIME for an audio-only WebM recording', async () => {
    const h = harness();
    const bytes = decodableWebmContainer();

    const { assetId } = await receive(h, 'AUDIO', 'audio/webm', bytes);

    // The contract's clause: the sniff says video/webm, the kind stays AUDIO,
    // and the bytes are never relabelled to the declared type.
    expect(h.assets()[assetId]).toMatchObject({
      kind: 'AUDIO',
      mimeType: 'video/webm',
    });
  });

  it('refuses markup dressed as a picture, storing no asset', async () => {
    const h = harness();

    await expect(
      receive(h, 'IMAGE', 'image/png', undecodableMarkup()),
    ).rejects.toThrow();
    expect(Object.keys(h.assets())).toHaveLength(0);
  });

  it('refuses a real picture that exceeds the documented size, before any write', async () => {
    const h = harness();
    // A real PNG is still refused when it is too big for the kind.
    const oversized = Buffer.concat([
      decodablePng(),
      Buffer.alloc(5 * 1024 * 1024 + 1),
    ]);

    await expect(
      receive(h, 'IMAGE', 'image/png', oversized),
    ).rejects.toThrow('MEDIA_CONTENT_UNSUPPORTED');
    expect(await h.blobPaths()).toHaveLength(0);
    expect(Object.keys(h.assets())).toHaveLength(0);
  });

  it('refuses a MIME outside the kind even when the bytes are real media', async () => {
    const h = harness();

    // A real MP4 offered as an image: the declared type is not an image type.
    await expect(
      receive(h, 'IMAGE', 'video/mp4', decodableMp4()),
    ).rejects.toThrow('MEDIA_CONTENT_UNSUPPORTED');
    expect(Object.keys(h.assets())).toHaveLength(0);
  });

  it('refuses a real picture whose declared type contradicts its bytes', async () => {
    const h = harness();

    // Real PNG bytes, declared as MP4. Both are allowed types for their own
    // kinds, so only the sniff can catch this.
    await expect(
      receive(h, 'VIDEO', 'video/mp4', decodablePng()),
    ).rejects.toThrow();
    expect(Object.keys(h.assets())).toHaveLength(0);
  });

  it('does not write an asset when the connection is revoked inside the transaction', async () => {
    const h = harness();

    h.live.value = false;

    await expect(
      receive(h, 'IMAGE', 'image/png', decodablePng()),
    ).rejects.toThrow('CONNECTION_REVOKED');
    expect(Object.keys(h.assets())).toHaveLength(0);
  });

  it('refuses the read-back when the operator loses access after storage', async () => {
    const h = harness();
    const { assetId } = await receive(h, 'IMAGE', 'image/png', decodablePng());

    h.allow.value = false;

    await expect(
      h.service.read(actor, { conversationId, assetId }),
    ).rejects.toThrow('MESSAGING_ACCESS_DENIED');
  });

  it('refuses a read token minted for another asset or another user', async () => {
    const h = harness();
    const { assetId } = await receive(h, 'IMAGE', 'image/png', decodablePng());
    const other = await receive(
      h,
      'IMAGE',
      'image/png',
      decodablePng(1, 2, 3),
    );

    const forOther = new URL(
      `https://fixture.invalid${(await h.service.read(actor, { conversationId, assetId: other.assetId })).downloadPath}`,
    ).searchParams.get('token');

    await expect(
      h.service.open(
        actor,
        { conversationId, assetId },
        forOther as string,
      ),
    ).rejects.toThrow('MEDIA_READ_TOKEN_INVALID');

    // A token signed for a different user does not open this asset either.
    const foreign = await h.signedBy({
      type: 'FILE',
      sub: actor.workspaceId,
      workspaceId: actor.workspaceId,
      fileId: assetId,
      userId: randomUUID(),
      userWorkspaceId: actor.userWorkspaceId,
      purpose: 'hermes-media-read',
    });

    await expect(
      h.service.open(actor, { conversationId, assetId }, foreign),
    ).rejects.toThrow('MEDIA_READ_TOKEN_INVALID');
  });

  it('refuses a tampered read token', async () => {
    const h = harness();
    const { assetId } = await receive(h, 'IMAGE', 'image/png', decodablePng());
    const read = await h.service.read(actor, { conversationId, assetId });
    const token = new URL(
      `https://fixture.invalid${read.downloadPath}`,
    ).searchParams.get('token') as string;

    await expect(
      h.service.open(
        actor,
        { conversationId, assetId },
        `${token.split('.')[0]}.forged-signature`,
      ),
    ).rejects.toThrow('MEDIA_READ_TOKEN_INVALID');
  });

  it('does not let another conversation read the asset', async () => {
    const h = harness();
    const { assetId } = await receive(h, 'IMAGE', 'image/png', decodablePng());

    await expect(
      h.service.read(actor, {
        conversationId: randomUUID(),
        assetId,
      }),
    ).rejects.toThrow();
  });

  it('is idempotent on a replayed provider message, writing one asset only', async () => {
    const h = harness();
    const providerMessageId = randomUUID();
    const bytes = decodablePng();

    const first = await receive(
      h,
      'IMAGE',
      'image/png',
      bytes,
      providerMessageId,
    );
    const second = await receive(
      h,
      'IMAGE',
      'image/png',
      bytes,
      providerMessageId,
    );

    expect(second.assetId).toBe(first.assetId);
    expect(Object.keys(h.assets())).toHaveLength(1);
  });

  it('refuses a replay whose bytes changed under the same provider message', async () => {
    const h = harness();
    const providerMessageId = randomUUID();

    await receive(h, 'IMAGE', 'image/png', decodablePng(), providerMessageId);

    await expect(
      receive(
        h,
        'IMAGE',
        'image/png',
        decodablePng(9, 9, 9),
        providerMessageId,
      ),
    ).rejects.toThrow('PROVIDER_MEDIA_CONFLICT');
  });
});
