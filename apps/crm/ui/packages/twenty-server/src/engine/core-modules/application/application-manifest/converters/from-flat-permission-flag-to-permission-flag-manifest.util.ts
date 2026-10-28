import { type PermissionFlagManifest } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type UniversalFlatPermissionFlag } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-permission-flag.type';

export const fromFlatPermissionFlagToPermissionFlagManifest = ({
  flatPermissionFlag,
}: {
  flatPermissionFlag: UniversalFlatPermissionFlag;
}): PermissionFlagManifest => ({
  universalIdentifier: flatPermissionFlag.universalIdentifier,
  key: flatPermissionFlag.key,
  label: flatPermissionFlag.label,
  ...(isDefined(flatPermissionFlag.description)
    ? { description: flatPermissionFlag.description }
    : {}),
  ...(isDefined(flatPermissionFlag.icon)
    ? { icon: flatPermissionFlag.icon }
    : {}),
  permissionType: flatPermissionFlag.permissionType,
});
