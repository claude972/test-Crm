import { type FieldPermissionManifest } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type UniversalFlatFieldPermission } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-permission.type';

export const fromFlatFieldPermissionToFieldPermissionManifest = ({
  flatFieldPermission,
}: {
  flatFieldPermission: UniversalFlatFieldPermission;
}): FieldPermissionManifest => ({
  universalIdentifier: flatFieldPermission.universalIdentifier,
  objectUniversalIdentifier:
    flatFieldPermission.objectMetadataUniversalIdentifier,
  fieldUniversalIdentifier:
    flatFieldPermission.fieldMetadataUniversalIdentifier,
  ...(isDefined(flatFieldPermission.canReadFieldValue)
    ? { canReadFieldValue: flatFieldPermission.canReadFieldValue }
    : {}),
  ...(isDefined(flatFieldPermission.canUpdateFieldValue)
    ? { canUpdateFieldValue: flatFieldPermission.canUpdateFieldValue }
    : {}),
});
