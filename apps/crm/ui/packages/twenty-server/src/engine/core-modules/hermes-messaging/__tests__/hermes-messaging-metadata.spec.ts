import { DataSource, Table, TableForeignKey, type QueryRunner } from 'typeorm';
import { HermesBotPolicyEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-bot-policy.entity';
import { AddHermesBotPolicyFastInstanceCommand } from 'src/database/commands/upgrade-version-command/2-52/2-52-instance-command-fast-1793392487144-add-hermes-bot-policy';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesInboxMessageEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
jest.mock(
  'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator',
  () => ({ RegisteredInstanceCommand: () => () => {} }),
);
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
        HermesBotPolicyEntity,
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
  it('matches the generated policy migration to current TypeORM metadata and reversible SQL', async () => {
    const source = new DataSource({
      type: 'postgres',
      entities: [WorkspaceEntity, HermesBotPolicyEntity],
      synchronize: false,
    });
    await (
      source as unknown as { buildMetadatas: () => Promise<void> }
    ).buildMetadatas();
    const metadata = source.getMetadata(HermesBotPolicyEntity);
    expect(
      metadata.primaryColumns.map((column) => column.databaseName),
    ).toEqual(['workspaceId', 'scope']);
    expect(metadata.foreignKeys[0].onDelete).toBe('CASCADE');
    expect(metadata.foreignKeys[0].referencedEntityMetadata).toBe(
      source.getMetadata(WorkspaceEntity),
    );
    const table = Table.create(metadata, source.driver);
    const runner = source.createQueryRunner();
    runner.enableSqlMemory();
    await runner.createTable(table, false, false);
    for (const key of metadata.foreignKeys)
      await runner.createForeignKey(
        table,
        TableForeignKey.create(key, source.driver),
      );
    const generated = runner.getMemorySql();
    const up: string[] = [],
      down: string[] = [];
    const command = new AddHermesBotPolicyFastInstanceCommand();
    await command.up({
      query: async (sql: string) => {
        up.push(sql);
      },
    } as QueryRunner);
    await command.down({
      query: async (sql: string) => {
        down.push(sql);
      },
    } as QueryRunner);
    expect(up).toEqual(generated.upQueries.map(({ query }) => query));
    expect(down).toEqual(
      [...generated.downQueries].reverse().map(({ query }) => query),
    );
    expect(up).toHaveLength(2);
    expect(up[0]).toContain('PRIMARY KEY ("workspaceId", "scope")');
    expect(up[1]).toContain('ON DELETE CASCADE');
  });
});
