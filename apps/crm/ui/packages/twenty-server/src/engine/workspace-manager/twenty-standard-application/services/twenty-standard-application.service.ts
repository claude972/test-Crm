import { Injectable } from '@nestjs/common';

import { isDefined } from 'kovaa-lab-shared/utils';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { MetadataFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/metadata-flat-entity.type';
import { getMetadataFlatEntityMapsKey } from 'src/engine/metadata-modules/flat-entity/utils/get-metadata-flat-entity-maps-key.util';
import { findManyFlatEntityByUniversalIdentifierInUniversalFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-many-flat-entity-by-universal-identifier-in-universal-flat-entity-maps.util';
import { getSubFlatEntityMapsByApplicationIdsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/get-sub-flat-entity-maps-by-application-ids-or-throw.util';
import { computeMissingInitialObjectViewOperations } from 'src/engine/metadata-modules/view/utils/compute-missing-initial-object-view-operations.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';
import { KOVAALAB_STANDARD_ALL_METADATA_NAME } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-all-metadata-name.constant';
import { keepWorkspaceOwnedProperties } from 'src/engine/metadata-modules/flat-entity/utils/keep-workspace-owned-properties.util';
import { computeKovaaLabCRMStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationBuilderException } from 'src/engine/workspace-manager/workspace-migration/exceptions/workspace-migration-builder-exception';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { FromToAllUniversalFlatEntityMaps } from 'src/engine/workspace-manager/workspace-migration/types/workspace-migration-orchestrator.type';

// TODO completely deprecate this file once we've created the kovaa-lab-standard kovaa-lab-app manifest
@Injectable()
export class KovaaLabCRMStandardApplicationService {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
  ) {}

  async synchronizeKovaaLabCRMStandardApplicationOrThrow({
    workspaceId,
  }: {
    workspaceId: string;
  }) {
    const { kovaaLabStandardFlatApplication } =
      await this.applicationService.findWorkspaceKovaaLabCRMStandardAndCustomApplicationOrThrow(
        {
          workspaceId,
        },
      );
    const {
      featureFlagsMap,
      billingEntitlements,
      ...fromKovaaLabCRMStandardAllFlatEntityMaps
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      ...KOVAALAB_STANDARD_ALL_METADATA_NAME.map(getMetadataFlatEntityMapsKey),
      'featureFlagsMap',
      'billingEntitlements',
    ]);

    const {
      allFlatEntityMaps: toKovaaLabCRMStandardAllFlatEntityMaps,
      idByUniversalIdentifierByMetadataName,
    } = computeKovaaLabCRMStandardApplicationAllFlatEntityMaps({
      now: new Date().toISOString(),
      workspaceId,
      kovaaLabStandardApplicationId: kovaaLabStandardFlatApplication.id,
      isWorkspaceCreation: true,
    });

    const fromToAllFlatEntityMaps: FromToAllUniversalFlatEntityMaps = {};

    for (const metadataName of KOVAALAB_STANDARD_ALL_METADATA_NAME) {
      const flatEntityMapsKey = getMetadataFlatEntityMapsKey(metadataName);
      const fromFlatEntityMaps =
        fromKovaaLabCRMStandardAllFlatEntityMaps[flatEntityMapsKey];
      const from = getSubFlatEntityMapsByApplicationIdsOrThrow<
        MetadataFlatEntity<typeof metadataName>
      >({
        applicationIds: [kovaaLabStandardFlatApplication.id],
        flatEntityMaps: fromFlatEntityMaps,
      });

      const fromTo = {
        from,
        to: keepWorkspaceOwnedProperties({
          metadataName,
          fromFlatEntityMaps: from,
          toFlatEntityMaps:
            toKovaaLabCRMStandardAllFlatEntityMaps[flatEntityMapsKey],
        }),
      };

      // @ts-expect-error Metadata flat entity maps cache key and metadataName colliding
      fromToAllFlatEntityMaps[flatEntityMapsKey] = fromTo;
    }

    const validateAndBuildResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigrationFromTo(
        {
          buildOptions: {
            isSystemBuild: true,
            inferDeletionFromMissingEntities: true,
            applicationUniversalIdentifier:
              kovaaLabStandardFlatApplication.universalIdentifier,
          },
          fromToAllFlatEntityMaps,
          workspaceId,
          additionalCacheDataMaps: {
            featureFlagsMap,
            billingEntitlements,
          },
          idByUniversalIdentifierByMetadataName,
        },
      );

    if (validateAndBuildResult.status === 'fail') {
      throw new WorkspaceMigrationBuilderException(
        validateAndBuildResult,
        'Multiple validation errors occurred while synchronizing kovaa-lab-standard application',
      );
    }

    if (!isDefined(kovaaLabStandardFlatApplication.defaultRoleId)) {
      await this.setStandardApplicationDefaultRoleOrThrow({
        workspaceId,
        kovaaLabStandardApplicationId: kovaaLabStandardFlatApplication.id,
      });
    }

    await this.seedStandardObjectInitialViewsOrThrow({
      workspaceId,
      standardObjectMetadataUniversalIdentifiers: Object.keys(
        toKovaaLabCRMStandardAllFlatEntityMaps.flatObjectMetadataMaps
          .byUniversalIdentifier,
      ),
    });
  }

  private async setStandardApplicationDefaultRoleOrThrow({
    workspaceId,
    kovaaLabStandardApplicationId,
  }: {
    workspaceId: string;
    kovaaLabStandardApplicationId: string;
  }): Promise<void> {
    const { flatRoleMaps } = await this.workspaceCacheService.getOrRecompute(
      workspaceId,
      ['flatRoleMaps'],
    );

    const adminFlatRole = findFlatEntityByUniversalIdentifier({
      universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
      flatEntityMaps: flatRoleMaps,
    });

    if (!isDefined(adminFlatRole)) {
      throw new ApplicationException(
        `Could not find the Admin role in workspace ${workspaceId}`,
        ApplicationExceptionCode.ENTITY_NOT_FOUND,
      );
    }

    await this.applicationService.update(kovaaLabStandardApplicationId, {
      workspaceId,
      defaultRoleId: adminFlatRole.id,
    });
  }

  private async seedStandardObjectInitialViewsOrThrow({
    workspaceId,
    standardObjectMetadataUniversalIdentifiers,
  }: {
    workspaceId: string;
    standardObjectMetadataUniversalIdentifiers: string[];
  }): Promise<void> {
    const { flatObjectMetadataMaps, flatViewMaps, flatViewFieldMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatObjectMetadataMaps',
        'flatViewMaps',
        'flatViewFieldMaps',
      ]);

    const { workspaceCustomFlatApplication } =
      await this.applicationService.findWorkspaceKovaaLabCRMStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const seedOperations = computeMissingInitialObjectViewOperations({
      flatObjectMetadatas:
        findManyFlatEntityByUniversalIdentifierInUniversalFlatEntityMaps({
          flatEntityMaps: flatObjectMetadataMaps,
          universalIdentifiers: standardObjectMetadataUniversalIdentifiers,
        }),
      flatViewMaps,
      flatViewFieldMaps,
      initialViewApplicationUniversalIdentifier:
        workspaceCustomFlatApplication.universalIdentifier,
    });

    if (
      seedOperations.viewsToCreate.length === 0 &&
      seedOperations.viewFieldsToCreate.length === 0
    ) {
      return;
    }

    const result =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunLegacyWorkspaceMigration(
        {
          isSystemBuild: true,
          workspaceId,
          applicationUniversalIdentifier:
            workspaceCustomFlatApplication.universalIdentifier,
          allFlatEntityOperationByMetadataName: {
            view: {
              flatEntityToCreate: seedOperations.viewsToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
            viewField: {
              flatEntityToCreate: seedOperations.viewFieldsToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
          },
        },
      );

    if (result.status === 'fail') {
      throw new WorkspaceMigrationBuilderException(
        result,
        `Multiple validation errors occurred while seeding initial object views for workspace ${workspaceId}`,
      );
    }
  }
}
