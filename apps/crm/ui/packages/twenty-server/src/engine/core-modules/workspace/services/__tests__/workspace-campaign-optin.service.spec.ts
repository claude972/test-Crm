import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';
import { FeatureFlagKey } from 'kovaa-lab-shared/types';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceService } from 'src/engine/core-modules/workspace/services/workspace.service';

jest.mock('src/database/typeorm/postgres-advisory-lock.service', () => ({
  PostgresAdvisoryLockService: class {},
}));
jest.mock(
  'src/engine/core-entity-cache/services/core-entity-cache.service',
  () => ({ CoreEntityCacheService: class {} }),
);
jest.mock('src/engine/core-modules/application/application.service', () => ({
  ApplicationService: class {},
}));
jest.mock(
  'src/engine/core-modules/application/application-manifest/services/application-uninstall.service',
  () => ({ ApplicationUninstallService: class {} }),
);
jest.mock(
  'src/engine/core-modules/application/pre-installed-apps/pre-installed-apps.service',
  () => ({ PreInstalledAppsService: class {} }),
);
jest.mock(
  'src/engine/core-modules/billing/services/billing-subscription.service',
  () => ({ BillingSubscriptionService: class {} }),
);
jest.mock('src/engine/core-modules/billing/services/billing.service', () => ({
  BillingService: class {},
}));
jest.mock(
  'src/engine/core-modules/dns-manager/services/dns-manager.service',
  () => ({ DnsManagerService: class {} }),
);
jest.mock(
  'src/engine/core-modules/domain/custom-domain-manager/services/custom-domain-manager.service',
  () => ({ CustomDomainManagerService: class {} }),
);
jest.mock(
  'src/engine/core-modules/domain/subdomain-manager/services/subdomain-manager.service',
  () => ({ SubdomainManagerService: class {} }),
);
jest.mock(
  'src/engine/core-modules/event-logs/retention/services/event-log-retention.service',
  () => ({ EventLogRetentionService: class {} }),
);
jest.mock(
  'src/engine/core-modules/emailing-domain/jobs/emailing-domain-workspace-cleanup.job',
  () => ({ EmailingDomainWorkspaceCleanupJob: class {} }),
);
jest.mock(
  'src/engine/core-modules/exception-handler/exception-handler.service',
  () => ({ ExceptionHandlerService: class {} }),
);
jest.mock(
  'src/engine/core-modules/feature-flag/services/feature-flag.service',
  () => ({ FeatureFlagService: class {} }),
);
jest.mock(
  'src/engine/core-modules/file/file-core-picture/services/file-core-picture.service',
  () => ({ FileCorePictureService: class {} }),
);
jest.mock(
  'src/engine/core-modules/file/jobs/file-workspace-folder-deletion.job',
  () => ({ FileWorkspaceFolderDeletionJob: class {} }),
);
jest.mock(
  'src/engine/core-modules/message-queue/services/message-queue.service',
  () => ({ MessageQueueService: class {} }),
);
jest.mock(
  'src/engine/core-modules/sdk-client/sdk-client-generation.service',
  () => ({ SdkClientGenerationService: class {} }),
);
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock(
  'src/engine/core-modules/upgrade/services/upgrade-migration.service',
  () => ({ UpgradeMigrationService: class {} }),
);
jest.mock(
  'src/engine/core-modules/upgrade/services/upgrade-sequence-reader.service',
  () => ({ UpgradeSequenceReaderService: class {} }),
);
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.service',
  () => ({ UserWorkspaceService: class {} }),
);
jest.mock(
  'src/engine/core-modules/workspace/jobs/workspace-deletion-application-uninstall.job',
  () => ({ WorkspaceDeletionApplicationUninstallJob: class {} }),
);
jest.mock(
  'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service',
  () => ({ AiModelRegistryService: class {} }),
);
jest.mock(
  'src/engine/metadata-modules/flat-entity/constant/all-metadata-names-sorted-atomically.constant',
  () => ({ ALL_METADATA_NAMES_SORTED_ATOMICALLY: class {} }),
);
jest.mock(
  'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service',
  () => ({ WorkspaceManyOrAllFlatEntityMapsCacheService: class {} }),
);
jest.mock(
  'src/engine/metadata-modules/permissions/permissions.service',
  () => ({ PermissionsService: class {} }),
);
jest.mock(
  'src/engine/metadata-modules/role-assignment-validation/services/role-assignment-validation.service',
  () => ({ RoleAssignmentValidationService: class {} }),
);
jest.mock(
  'src/engine/workspace-cache-storage/workspace-cache-storage.service',
  () => ({ WorkspaceCacheStorageService: class {} }),
);
jest.mock('src/engine/workspace-datasource/workspace-schema.service', () => ({
  WorkspaceSchemaService: class {},
}));
jest.mock(
  'src/engine/workspace-manager/standard-objects-prefill-data/services/prefill-logic-function.service',
  () => ({ PrefillLogicFunctionService: class {} }),
);
jest.mock('src/engine/workspace-manager/workspace-manager.service', () => ({
  WorkspaceManagerService: class {},
}));

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_WORKSPACE_ID = '00000000-0000-4000-8000-000000000002';
const setup = (optIn: unknown) => {
  const workspace = {
    id: WORKSPACE_ID,
    activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
    isCampaignOpenTrackingEnabled: false,
    isCampaignClickTrackingEnabled: false,
  } as WorkspaceEntity;
  const user = {
    id: 'fixture-user',
    canAccessFullAdminPanel: false,
  } as AuthContextUser;
  const repository = {
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    findOneBy: jest.fn().mockResolvedValue(workspace),
  };
  const flags = jest.fn().mockResolvedValue(undefined);
  const init = jest.fn().mockResolvedValue(undefined);
  const createMember = jest.fn().mockResolvedValue(undefined);
  const service: WorkspaceService = Object.assign(
    Object.create(WorkspaceService.prototype),
    {
      workspaceRepository: repository,
      coreEntityCacheService: {
        invalidate: jest.fn().mockResolvedValue(undefined),
      },
      workspaceManagerService: { init },
      featureFlagService: { enableFeatureFlags: flags },
      kovaaLabConfigService: { get: jest.fn().mockReturnValue(optIn) },
      userWorkspaceService: { createWorkspaceMember: createMember },
      prefillCreatedWorkspaceRecords: jest.fn().mockResolvedValue(undefined),
      activateAndInitializeUpgradeState: jest.fn().mockResolvedValue(undefined),
      enqueuePreInstalledAppsInstallation: jest
        .fn()
        .mockResolvedValue(undefined),
      sdkClientGenerationService: {
        enqueueSdkClientGenerationForWorkspace: jest
          .fn()
          .mockResolvedValue(undefined),
      },
    },
  );
  return { service, workspace, user, repository, flags, init, createMember };
};

describe('new workspace campaign operator opt-in', () => {
  it.each([false, undefined, 'true', 1])(
    'does not enable campaigns unless config is boolean true (%s)',
    async (value) => {
      const { service, workspace, user, flags } = setup(value);
      await service.activateWorkspace(user, workspace);
      expect(flags).toHaveBeenCalledTimes(1);
      expect(flags.mock.calls.flatMap(([keys]) => keys)).not.toContain(
        FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
      );
    },
  );

  it('enables only campaign drafts for the workspace being initialized, after native preparation', async () => {
    const { service, workspace, user, flags, init, createMember } = setup(true);
    await service.activateWorkspace(user, workspace);
    expect(flags).toHaveBeenNthCalledWith(
      2,
      [FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED],
      WORKSPACE_ID,
    );
    expect(
      flags.mock.calls.every(
        ([, id]) => id === WORKSPACE_ID && id !== OTHER_WORKSPACE_ID,
      ),
    ).toBe(true);
    expect(init).toHaveBeenCalledWith({ workspace, userId: user.id });
    expect(init.mock.invocationCallOrder[0]).toBeLessThan(
      flags.mock.invocationCallOrder[1],
    );
    expect(createMember).toHaveBeenCalledWith(WORKSPACE_ID, user);
    expect(workspace.isCampaignOpenTrackingEnabled).toBe(false);
    expect(workspace.isCampaignClickTrackingEnabled).toBe(false);
    expect(user.canAccessFullAdminPanel).toBe(false);
    expect(flags.mock.calls.flatMap(([keys]) => keys)).toEqual([
      FeatureFlagKey.IS_REST_METADATA_API_NEW_FORMAT_DIRECT,
      FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
    ]);
  });

  it('does not enable flags if native workspace initialization fails', async () => {
    const { service, workspace, user, flags, init } = setup(true);
    init.mockRejectedValue(new Error('Preparation failed'));
    await expect(service.activateWorkspace(user, workspace)).rejects.toThrow(
      'Preparation failed',
    );
    expect(flags).not.toHaveBeenCalled();
  });

  it('propagates a native feature flag failure instead of completing activation', async () => {
    const { service, workspace, user, flags, createMember, repository } =
      setup(true);
    flags
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Flag persistence failed'));
    await expect(service.activateWorkspace(user, workspace)).rejects.toThrow(
      'Flag persistence failed',
    );
    expect(createMember).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenLastCalledWith(WORKSPACE_ID, {
      activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
    });
  });

  it('does not change an existing active workspace when activation is retried', async () => {
    const { service, workspace, user, flags, repository, init } = setup(true);
    repository.update.mockResolvedValue({ affected: 0 });
    repository.findOneBy.mockResolvedValue({
      ...workspace,
      activationStatus: WorkspaceActivationStatus.ACTIVE,
    });
    await service.activateWorkspace(user, workspace);
    expect(flags).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();
  });

  it('rejects a scope with no activation claim before enabling any flag', async () => {
    const { service, workspace, user, flags, repository, init } = setup(true);
    repository.update.mockResolvedValue({ affected: 0 });
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.activateWorkspace(user, workspace)).rejects.toThrow(
      'Workspace is already being created',
    );
    expect(flags).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();
  });
});
