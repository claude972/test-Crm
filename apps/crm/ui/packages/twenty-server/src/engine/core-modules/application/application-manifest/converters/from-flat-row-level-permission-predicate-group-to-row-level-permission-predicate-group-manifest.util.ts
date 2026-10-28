import { type RowLevelPermissionPredicateGroupManifest } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type UniversalFlatRowLevelPermissionPredicateGroup } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-row-level-permission-predicate-group.type';

export const fromFlatRowLevelPermissionPredicateGroupToRowLevelPermissionPredicateGroupManifest =
  ({
    flatRowLevelPermissionPredicateGroup,
  }: {
    flatRowLevelPermissionPredicateGroup: UniversalFlatRowLevelPermissionPredicateGroup;
  }): RowLevelPermissionPredicateGroupManifest => ({
    universalIdentifier:
      flatRowLevelPermissionPredicateGroup.universalIdentifier,
    objectUniversalIdentifier:
      flatRowLevelPermissionPredicateGroup.objectMetadataUniversalIdentifier,
    logicalOperator: flatRowLevelPermissionPredicateGroup.logicalOperator,
    ...(isDefined(
      flatRowLevelPermissionPredicateGroup.parentRowLevelPermissionPredicateGroupUniversalIdentifier,
    )
      ? {
          parentPredicateGroupUniversalIdentifier:
            flatRowLevelPermissionPredicateGroup.parentRowLevelPermissionPredicateGroupUniversalIdentifier,
        }
      : {}),
    ...(isDefined(
      flatRowLevelPermissionPredicateGroup.positionInRowLevelPermissionPredicateGroup,
    )
      ? {
          position:
            flatRowLevelPermissionPredicateGroup.positionInRowLevelPermissionPredicateGroup,
        }
      : {}),
  });
