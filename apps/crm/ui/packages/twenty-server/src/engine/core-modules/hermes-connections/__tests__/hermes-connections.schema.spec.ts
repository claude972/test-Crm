import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { isInputObjectType, parse, validate } from 'graphql';

import { HermesConnectionsResolver } from '../hermes-connections.resolver';

jest.mock(
  'src/engine/core-modules/hermes-connections/hermes-connections.service',
  () => ({ HermesConnectionsService: class {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));

describe('native connection metadata schema contract', () => {
  it('builds a non-null list and mutations without accepting a caller-selected tenant', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    try {
      const schema = await module
        .get(GraphQLSchemaFactory)
        .create([HermesConnectionsResolver]);
      const query = schema.getQueryType()!.getFields().hermesConnectionsV4;
      expect(String(query.type)).toBe('[JSONObject!]!');
      expect(query.args).toEqual([]);
      expect(
        String(
          schema.getMutationType()!.getFields().hermesSaveConnectionV4.type,
        ),
      ).toBe('JSONObject!');
      const input = schema.getType('HermesConnectionSaveInput');
      expect(isInputObjectType(input)).toBe(true);
      if (!isInputObjectType(input))
        throw new Error('Missing native connection input');
      expect(Object.keys(input.getFields()).sort()).toEqual([
        'expectedRevision',
        'kind',
        'secrets',
        'settings',
      ]);
      expect(validate(schema, parse('{ hermesConnectionsV4 }'))).toEqual([]);
      expect(
        validate(
          schema,
          parse(
            'mutation { hermesSaveConnectionV4(input:{kind:"MCP",expectedRevision:0,settings:{},workspaceId:"foreign"}) }',
          ),
        )[0]?.message,
      ).toContain('is not defined');
      expect(schema.getType('HermesConnectionEntity')).toBeUndefined();
    } finally {
      await module.close();
    }
  });
});
