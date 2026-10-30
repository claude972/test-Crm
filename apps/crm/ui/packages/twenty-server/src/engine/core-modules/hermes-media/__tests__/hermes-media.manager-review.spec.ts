import { randomUUID } from 'node:crypto';
import { HermesMediaService } from '../hermes-media.service';
import { HermesMediaAssetEntity } from '../hermes-media.entity';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
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

function transactionHarness() {
  const actor = {
    workspaceId: randomUUID(),
    userWorkspaceId: randomUUID(),
    userId: randomUUID(),
  };
  const conversationId = randomUUID(),
    assetId = randomUUID(),
    messageId = randomUUID();
  const asset = {
    id: assetId,
    workspaceId: actor.workspaceId,
    conversationId,
    providerConnectionId: 'test',
    status: 'READY',
    ownerUserWorkspaceId: actor.userWorkspaceId,
  };
  const conversation = {
    id: conversationId,
    workspaceId: actor.workspaceId,
    channel: 'EMAIL',
    providerConnectionId: 'test',
  };
  const dataSource = {
    getRepository: jest.fn(() => {
      throw new Error(
        'SECOND_POOL_CONNECTION_REQUIRED_INSIDE_LEDGER_TRANSACTION',
      );
    }),
  };
  const assets = {
    findOneBy: jest.fn(async () => asset),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const conversations = { findOneBy: jest.fn(async () => conversation) };
  const manager = {
    getRepository: jest.fn((target: unknown) =>
      target === HermesMediaAssetEntity
        ? assets
        : target === HermesConversationEntity
          ? conversations
          : undefined,
    ),
  };
  const access = { assertAllowed: jest.fn(async () => {}) };
  const service = new HermesMediaService(
    dataSource as never,
    access as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return {
    actor,
    conversationId,
    assetId,
    messageId,
    asset,
    dataSource,
    assets,
    manager,
    access,
    service,
  };
}

it('bind reuses the ledger transaction for authorization and conversation lookup without acquiring another pool connection', async () => {
  const h = transactionHarness();
  await expect(
    h.service.bind(
      h.actor,
      { conversationId: h.conversationId, assetId: h.assetId },
      h.messageId,
      h.manager as never,
    ),
  ).resolves.toEqual(h.asset);
  expect(h.access.assertAllowed).toHaveBeenCalledWith(h.actor, h.manager);
  expect(h.dataSource.getRepository).not.toHaveBeenCalled();
  expect(h.assets.update).toHaveBeenCalledTimes(1);
});

it('rechecks transaction authorization after an awaited asset lookup and refuses the write after revocation', async () => {
  const h = transactionHarness();
  let revoked = false;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  h.access.assertAllowed.mockImplementation(async () => {
    if (revoked) throw new Error('MEMBERSHIP_REVOKED');
  });
  h.assets.findOneBy.mockImplementation(async () => {
    await gate;
    return h.asset;
  });
  const pending = h.service.bind(
    h.actor,
    { conversationId: h.conversationId, assetId: h.assetId },
    h.messageId,
    h.manager as never,
  );
  const outcome = expect(pending).rejects.toThrow('MEMBERSHIP_REVOKED');
  while (!h.assets.findOneBy.mock.calls.length) await Promise.resolve();
  revoked = true;
  release();
  await outcome;
  expect(h.assets.update).not.toHaveBeenCalled();
  expect(h.access.assertAllowed).toHaveBeenCalledWith(h.actor, h.manager);
  expect(h.dataSource.getRepository).not.toHaveBeenCalled();
});

it('eight reserved transaction managers need no additional data-source checkout', async () => {
  const harnesses = Array.from({ length: 8 }, transactionHarness);
  await Promise.all(
    harnesses.map((h) =>
      h.service.bind(
        h.actor,
        { conversationId: h.conversationId, assetId: h.assetId },
        h.messageId,
        h.manager as never,
      ),
    ),
  );
  for (const h of harnesses) {
    expect(h.dataSource.getRepository).not.toHaveBeenCalled();
    expect(h.assets.update).toHaveBeenCalledTimes(1);
    expect(h.access.assertAllowed).toHaveBeenCalledWith(h.actor, h.manager);
  }
});
