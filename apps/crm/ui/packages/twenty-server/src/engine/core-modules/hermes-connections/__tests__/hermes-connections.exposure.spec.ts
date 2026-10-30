import { MODULE_METADATA } from '@nestjs/common/constants';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';

import { metadataModuleFactory } from 'src/engine/api/graphql/metadata.module-factory';
import { HermesConnectionsModule } from '../hermes-connections.module';
import { HermesConnectionsResolver } from '../hermes-connections.resolver';

jest.mock(
  'src/engine/core-modules/hermes-connections/hermes-connections.service',
  () => ({ HermesConnectionsService: class {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));
jest.mock('src/engine/api/graphql/metadata-graphql-api.module', () => ({
  MetadataGraphQLApiModule: class {},
}));
jest.mock('src/modules/modules.module', () => ({ ModulesModule: class {} }));
jest.mock(
  'src/engine/core-modules/hermes-prospection/intake/hermes-intake.module',
  () => ({ HermesIntakeModule: class {} }),
);
jest.mock('src/engine/core-modules/hermes-mail/hermes-mail.module', () => ({
  HermesMailModule: class {},
}));
jest.mock(
  'src/engine/core-modules/hermes-connectors/hermes-messaging-connectors.module',
  () => ({ HermesMessagingConnectorsModule: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-messaging/hermes-messaging.module',
  () => ({ HermesMessagingModule: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-connectors/hermes-connectors.module',
  () => ({ HermesConnectorsModule: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-prospection.module',
  () => ({ HermesProspectionModule: class {} }),
);
jest.mock(
  'src/engine/core-modules/workspace/structure-dashboard/structure-dashboard.module',
  () => ({ StructureDashboardModule: class {} }),
);

describe('production metadata connection exposure', () => {
  it('selects the real D module through the native metadata factory and builds all three operation fields', async () => {
    const options = await metadataModuleFactory(
      { get: (key: string) => (key === 'NODE_ENV' ? 'test' : 1000) } as never,
      {} as never,
      { createLoaders: () => ({}) } as never,
      { get: jest.fn(), set: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      { getOrRecomputeCombinedHash: jest.fn() } as never,
    );
    expect(options.path).toBe('/metadata');
    const selected = (options.include ?? []).filter(
      (module) => module === HermesConnectionsModule,
    );
    expect(selected).toEqual([HermesConnectionsModule]);
    const resolvers = selected.flatMap((module) =>
      (
        Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) as unknown[]
      ).filter((provider) => provider === HermesConnectionsResolver),
    );
    expect(resolvers).toEqual([HermesConnectionsResolver]);
    const testing = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    try {
      const schema = await testing
        .get(GraphQLSchemaFactory)
        .create(
          resolvers as (typeof HermesConnectionsResolver)[],
          options.buildSchemaOptions ?? {},
        );
      expect(
        String(schema.getQueryType()!.getFields().hermesConnectionsV4.type),
      ).toBe('[JSONObject!]!');
      for (const field of [
        'hermesSaveConnectionV4',
        'hermesRemoveConnectionV4',
      ])
        expect(String(schema.getMutationType()!.getFields()[field].type)).toBe(
          'JSONObject!',
        );
    } finally {
      await testing.close();
    }
  });
});
