import { PIPES_METADATA } from '@nestjs/common/constants';
import { PARAM_ARGS_METADATA } from '@nestjs/graphql/dist/graphql.constants';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { isInputObjectType, parse, validate } from 'graphql';
import { HermesConnectionsResolver } from 'src/engine/core-modules/hermes-connections/hermes-connections.resolver';
import {
  EvolutionEnrollmentResolver,
  HermesWhatsappEnrollmentScopeInput,
} from '../evolution-enrollment.resolver';
jest.mock(
  'src/engine/core-modules/hermes-connections/hermes-connections.service',
  () => ({ HermesConnectionsService: class {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));
jest.mock('../evolution-enrollment.service', () => ({
  EvolutionEnrollmentService: class {},
}));
describe('managed enrollment native metadata API', () => {
  it('exposes four JSON mutations with implicit tenant and no secret/provider fields', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    try {
      const schema = await module
        .get(GraphQLSchemaFactory)
        .create([HermesConnectionsResolver, EvolutionEnrollmentResolver]);
      for (const suffix of ['Start', 'Qr', 'Status', 'Activate']) {
        const field = schema.getMutationType()!.getFields()[
          'hermesWhatsappEnrollment' + suffix
        ];
        expect(String(field.type)).toBe('JSONObject!');
        expect(field.args.map((value) => value.name)).toEqual(['input']);
        expect(
          validate(
            schema,
            parse(
              'mutation { hermesWhatsappEnrollment' +
                suffix +
                '(input:{expectedRevision:0}) }',
            ),
          ),
        ).toEqual([]);
      }
      for (const [name, fields] of [
        ['HermesWhatsappEnrollmentScopeInput', ['expectedRevision']],
        [
          'HermesWhatsappEnrollmentQrInput',
          ['expectedRevision', 'phoneNumber'],
        ],
      ] as const) {
        const input = schema.getType(name);
        expect(isInputObjectType(input)).toBe(true);
        if (!isInputObjectType(input)) throw new Error('Missing input');
        expect(Object.keys(input.getFields()).sort()).toEqual([...fields]);
      }
      expect(
        validate(
          schema,
          parse(
            'mutation { hermesWhatsappEnrollmentStart(input:{expectedRevision:0,workspaceId:"foreign",apiKey:"private",instanceName:"arbitrary"}) }',
          ),
        ),
      ).toHaveLength(3);
    } finally {
      await module.close();
    }
  });
  it('validates only form input, never the Express response graph', async () => {
    expect(
      Reflect.getMetadata(PIPES_METADATA, EvolutionEnrollmentResolver),
    ).toBeUndefined();
    for (const suffix of ['Start', 'Qr', 'Status', 'Activate']) {
      const parameters = Reflect.getMetadata(
        PARAM_ARGS_METADATA,
        EvolutionEnrollmentResolver,
        'hermesWhatsappEnrollment' + suffix,
      ) as Record<
        string,
        {
          index: number;
          pipes: Array<{
            transform: (value: unknown, metadata: unknown) => Promise<unknown>;
          }>;
        }
      >;
      const input = Object.values(parameters).find(
        (parameter) => parameter.index === 3,
      )!;
      const response = Object.values(parameters).find(
        (parameter) => parameter.index === 4,
      )!;
      expect(response.pipes).toHaveLength(0);
      expect(input.pipes).toHaveLength(1);
      await expect(
        input.pipes[0].transform(
          { expectedRevision: -1 },
          {
            metatype: HermesWhatsappEnrollmentScopeInput,
            type: 'body',
          },
        ),
      ).rejects.toThrow();
    }
  });
  it('sets no-store and derives actor exclusively from native authenticated context', async () => {
    const service = { qr: jest.fn(async () => ({ state: 'CONNECTING' })) };
    const resolver = new EvolutionEnrollmentResolver(service as never);
    const response = { setHeader: jest.fn() };
    await resolver.hermesWhatsappEnrollmentQr(
      { id: 'workspace' } as never,
      { id: 'user' } as never,
      'member',
      { expectedRevision: 1 },
      response as never,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
    expect(service.qr).toHaveBeenCalledWith(
      { workspaceId: 'workspace', userId: 'user', userWorkspaceId: 'member' },
      { expectedRevision: 1 },
    );
  });
});
