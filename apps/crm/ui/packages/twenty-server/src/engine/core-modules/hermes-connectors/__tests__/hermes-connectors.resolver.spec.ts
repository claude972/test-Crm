import {
  type CanActivate,
  type ExecutionContext,
  type Type,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';

import { parse, validate } from 'graphql';

import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { HermesConnectorsResolver } from 'src/engine/core-modules/hermes-connectors/hermes-connectors.resolver';

jest.mock(
  'src/engine/core-modules/hermes-connectors/hermes-connectors.service',
  () => ({ HermesConnectorsService: class HermesConnectorsService {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class WorkspaceEntity {},
}));

const workspace = {
  id: '11111111-1111-4111-8111-111111111111',
} as unknown as Parameters<
  HermesConnectorsResolver['hermesEvolutionConnection']
>[0];
const user = { id: 'user-a' } as Parameters<
  HermesConnectorsResolver['hermesEvolutionConnection']
>[1];

describe('Hermes Evolution metadata query', () => {
  it('exposes no external arguments for workspace, URL, credentials or instance', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    try {
      const schema = await module
        .get(GraphQLSchemaFactory)
        .create([HermesConnectorsResolver]);
      const field = schema
        .getQueryType()
        ?.getFields().hermesEvolutionConnection;

      expect(field?.args).toHaveLength(0);
      expect(
        validate(
          schema,
          parse(
            '{ hermesEvolutionConnection { workspaceId status providerState checkedAt errorCode } }',
          ),
        ),
      ).toEqual([]);
      for (const argument of [
        'workspaceId',
        'baseUrl',
        'apiKey',
        'instanceName',
      ]) {
        expect(
          validate(
            schema,
            parse(
              `{ hermesEvolutionConnection(${argument}: "external-value") { status } }`,
            ),
          )[0]?.message,
        ).toContain('Unknown argument');
      }
    } finally {
      await module.close();
    }
  });

  it('passes only the authenticated current workspace, user and membership to the service', async () => {
    const connectors = {
      evolutionConnection: jest
        .fn()
        .mockResolvedValue({ status: 'NOT_CONFIGURED' }),
    };
    const resolver = new HermesConnectorsResolver(
      connectors as unknown as ConstructorParameters<
        typeof HermesConnectorsResolver
      >[0],
    );

    await resolver.hermesEvolutionConnection(workspace, user, 'membership-a');
    expect(connectors.evolutionConnection).toHaveBeenCalledWith({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId: 'membership-a',
    });
  });

  it.each([
    {},
    { tokenType: JwtTokenTypeEnum.API_KEY, apiKey: {} },
    { tokenType: JwtTokenTypeEnum.PLAYGROUND, user: {} },
    { tokenType: JwtTokenTypeEnum.WORKSPACE_AGNOSTIC, user: {} },
  ])(
    'native principal guard refuses unauthorized input before service/probe: %j',
    (request) => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        HermesConnectorsResolver,
      ) as Type<CanActivate>[];
      const guard = new guards[0]();
      const context = {
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
      const connectors = { evolutionConnection: jest.fn() };
      const resolver = new HermesConnectorsResolver(
        connectors as unknown as ConstructorParameters<
          typeof HermesConnectorsResolver
        >[0],
      );
      const execute = () => {
        if (guard.canActivate(context))
          resolver.hermesEvolutionConnection(workspace, user, 'membership-a');
      };

      expect(execute).toThrow();
      expect(connectors.evolutionConnection).not.toHaveBeenCalled();
    },
  );
});
