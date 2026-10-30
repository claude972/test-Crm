import { DataSource } from 'typeorm';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesInboxMessageEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => {
  const { Entity, PrimaryColumn } = jest.requireActual('typeorm');
  class WorkspaceEntity {}
  Entity({ name: 'workspace', schema: 'core' })(WorkspaceEntity);
  PrimaryColumn('uuid')(WorkspaceEntity.prototype, 'id');
  return { WorkspaceEntity };
});

describe('native TypeORM inbox schema metadata without connecting to a DB', () => {
  it('registers composite tenant conversation FK and tenant/provider/client uniqueness', async () => {
    const source = new DataSource({
      type: 'postgres',
      entities: [
        WorkspaceEntity,
        HermesConversationEntity,
        HermesInboxMessageEntity,
      ],
      synchronize: false,
    });
    await (
      source as unknown as { buildMetadatas: () => Promise<void> }
    ).buildMetadatas();
    const message = source.getMetadata(HermesInboxMessageEntity),
      conversation = source.getMetadata(HermesConversationEntity);
    const conversationForeignKey = message.foreignKeys.find(
      (foreignKey) => foreignKey.referencedEntityMetadata === conversation,
    );
    expect(
      conversationForeignKey?.columns.map((column) => column.databaseName),
    ).toEqual(['workspaceId', 'conversationId']);
    expect(
      conversationForeignKey?.referencedColumns.map(
        (column) => column.databaseName,
      ),
    ).toEqual(['workspaceId', 'id']);
    expect(conversationForeignKey?.onDelete).toBe('CASCADE');
    expect(
      message.indices
        .find((index) => index.name === 'IDX_HERMES_MESSAGE_PROVIDER')
        ?.columns.map((column) => column.databaseName),
    ).toEqual([
      'workspaceId',
      'channel',
      'providerConnectionId',
      'providerMessageId',
    ]);
    expect(
      message.indices.find(
        (index) => index.name === 'IDX_HERMES_MESSAGE_CLIENT',
      )?.isUnique,
    ).toBe(true);
    expect(
      message.indices
        .find((index) => index.name === 'IDX_HERMES_MESSAGE_CLIENT')
        ?.columns.map((column) => column.databaseName),
    ).toEqual(['workspaceId', 'clientRequestId']);
    expect(
      conversation.indices.find(
        (index) => index.name === 'IDX_HERMES_CONVERSATION_TENANT_ID',
      )?.isUnique,
    ).toBe(true);
    expect(
      message.columns.find((column) => column.databaseName === 'text')
        ?.isNullable,
    ).toBe(false);
  });
});
