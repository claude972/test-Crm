import { Global, Module } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { randomBytes, randomUUID } from 'node:crypto';

import { HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesMessagingModule } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.module';
import { HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import { HermesMediaService } from 'src/engine/core-modules/hermes-media/hermes-media.service';
import { HermesMessagingConnectorsModule } from 'src/engine/core-modules/hermes-connectors/hermes-messaging-connectors.module';
import { HermesProspectionModule } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.module';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { HermesEventsModule } from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-events.module';
import { HermesIntakeModule } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.module';
import { HermesConnectedMcpAdapter } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-connected-mcp.adapter';
import { HermesMcpToolSurfaceService } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

// CJ-MCP-002 — the admin tool surface must read the STORED (central)
// connection, the same one the bot uses. Previously `HermesConnectedMcpAdapter`
// was provided only inside HermesMessagingConnectorsModule and not exported,
// and HermesIntakeModule did not import that module; sibling modules under
// CoreEngineModule share nothing, so the `@Optional()` injection resolved to
// undefined and discovery fell silently back to an empty
// HERMES_MCP_CONNECTIONS. The surface then reported NOT_CONFIGURED for an MCP
// that was in fact configured, contradicting the bot on the same instance.
//
// These tests compile the REAL HermesIntakeModule through real Nest DI. The
// two modules under test keep their real declarations, and
// HermesConnectedMcpAdapter and HermesMcpToolSurfaceService are the real
// classes; only unrelated infrastructure (database, Redis, workspace ORM,
// messaging, role lookup) is stubbed, because it cannot run here. The
// assertions check the PROVENANCE of the effective provider, not that Nest
// merely boots: a graph that starts and resolves the wrong provider is exactly
// the failure being pinned.
const workspaceId = randomUUID();
const actor = {
  workspaceId,
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const centralConnection = {
  workspaceId,
  connectionId: randomUUID(),
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
  revision: 1,
  settings: {
    // Schema-valid and deliberately unreachable: the SSRF boundary refuses a
    // private destination by default, so a real attempt ends UNAVAILABLE. That
    // is the discriminator against the fallback's NOT_CONFIGURED.
    endpoint: 'http://127.0.0.1:1/mcp',
    toolName: 'central_draft_tool',
    authorizedTools: ['central_draft_tool'],
    protocolVersion: '2025-11-25',
    argumentMap: { text: 'prompt' },
  },
  secrets: { token: randomBytes(32).toString('hex') },
};

let resolve: jest.Mock;
let configGet: jest.Mock;
let assertAllowed: jest.Mock;

@Module({
  providers: [
    {
      provide: HermesMessagingAdapterRegistry,
      useValue: {
        register: jest.fn(),
        registerBot: jest.fn(),
        getBot: jest.fn(),
      },
    },
    { provide: HermesMessagingService, useValue: {} },
    { provide: HermesMediaService, useValue: {} },
  ],
  exports: [
    HermesMessagingAdapterRegistry,
    HermesMessagingService,
    HermesMediaService,
  ],
})
class StubMessagingModule {}

@Module({
  providers: [
    {
      provide: HermesProspectionService,
      useValue: { list: jest.fn(async () => ({ batches: [] })) },
    },
    {
      provide: HermesProspectionAccessService,
      useFactory: () => ({ assertAllowed }),
    },
  ],
  exports: [HermesProspectionService, HermesProspectionAccessService],
})
class StubProspectionModule {}

@Module({})
class StubEventsModule {}

@Module({
  providers: [
    {
      provide: UserRoleService,
      useValue: { getRoleIdForUserWorkspace: jest.fn(async () => 'role-a') },
    },
  ],
  exports: [UserRoleService],
})
class StubUserRoleModule {}

// Mirrors how the real application supplies these globally; stubbing them is
// what lets the module under test compile with no database and no Redis.
@Global()
@Module({
  providers: [
    { provide: KovaaLabCRMConfigService, useFactory: () => ({ get: configGet }) },
    { provide: RedisClientService, useValue: {} },
    { provide: WorkspaceOrmManager, useValue: {} },
    { provide: HermesConnectionsService, useFactory: () => ({ resolve }) },
    {
      provide: getRepositoryToken(WorkspaceEntity),
      useValue: { findOneBy: jest.fn(async () => ({ id: workspaceId })) },
    },
  ],
  exports: [
    KovaaLabCRMConfigService,
    RedisClientService,
    WorkspaceOrmManager,
    HermesConnectionsService,
    getRepositoryToken(WorkspaceEntity),
  ],
})
class StubInfraModule {}

const build = (): TestingModuleBuilder =>
  Test.createTestingModule({ imports: [StubInfraModule, HermesIntakeModule] })
    .overrideModule(HermesMessagingModule)
    .useModule(StubMessagingModule)
    .overrideModule(HermesProspectionModule)
    .useModule(StubProspectionModule)
    .overrideModule(HermesEventsModule)
    .useModule(StubEventsModule)
    .overrideModule(UserRoleModule)
    .useModule(StubUserRoleModule)
    // TypeOrmModule.forFeature declares this token inside its own dynamic
    // module, which shadows the global stub, so it is replaced directly. This
    // is what removes the need for a live DataSource.
    .overrideProvider(getRepositoryToken(WorkspaceEntity))
    .useValue({ findOneBy: jest.fn(async () => ({ id: workspaceId })) });

describe('CJ-MCP-002 — effective module resolves the stored MCP connection', () => {
  beforeEach(() => {
    resolve = jest.fn(async (_id: string, kind: string) =>
      kind === 'MCP' ? centralConnection : null,
    );
    configGet = jest.fn(() => '{}');
    assertAllowed = jest.fn(async () => undefined);
  });

  it('injects the real connected adapter exported by the connectors module', async () => {
    const moduleRef = await build().compile();

    // Provenance of the effective provider: the instance the intake module
    // sees is the real class owned and exported by the connectors module.
    const injected = moduleRef.get(HermesConnectedMcpAdapter, {
      strict: false,
    });

    expect(injected).toBeInstanceOf(HermesConnectedMcpAdapter);
    expect(typeof injected.discoverTools).toBe('function');
  }, 180000);

  it('discovers through the central connection while the env map stays empty', async () => {
    const moduleRef = await build().compile();
    const surface = moduleRef.get(HermesMcpToolSurfaceService);

    const result = await surface.read(actor);

    // The stored connection was consulted for this company's MCP binding.
    expect(resolve).toHaveBeenCalledWith(workspaceId, 'MCP');
    // The private configuration map was never read: the fallback did not win.
    expect(configGet).not.toHaveBeenCalled();
    // A configured MCP is never reported as unconfigured. The attempt reached
    // the SSRF boundary of that unreachable endpoint, hence UNAVAILABLE.
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.status).not.toBe('NOT_CONFIGURED');
    expect(assertAllowed).toHaveBeenCalled();
  }, 180000);

  it('falls back to the env map only when the company has no stored connection', async () => {
    resolve = jest.fn(async () => null);
    const moduleRef = await build().compile();
    const surface = moduleRef.get(HermesMcpToolSurfaceService);

    const result = await surface.read(actor);

    // Negative control: with no stored connection the adapter answers
    // NOT_CONFIGURED, so the surface reports a company without a mapping.
    expect(resolve).toHaveBeenCalledWith(workspaceId, 'MCP');
    expect(result.status).toBe('NOT_CONFIGURED');
    expect(result.errorCode).toBeNull();
  }, 180000);
});

describe('CJ-MCP-002 — module metadata keeps one instance and one lifecycle', () => {
  // Structural guards: removing either declaration puts the surface back on
  // the silent fallback, so both are asserted directly.
  it('exports the connected adapter from the connectors module', () => {
    expect(
      Reflect.getMetadata('exports', HermesMessagingConnectorsModule),
    ).toContain(HermesConnectedMcpAdapter);
  });

  it('imports the connectors module rather than re-providing the adapter', () => {
    expect(Reflect.getMetadata('imports', HermesIntakeModule)).toContain(
      HermesMessagingConnectorsModule,
    );
    expect(Reflect.getMetadata('providers', HermesIntakeModule)).not.toContain(
      HermesConnectedMcpAdapter,
    );
  });
});
