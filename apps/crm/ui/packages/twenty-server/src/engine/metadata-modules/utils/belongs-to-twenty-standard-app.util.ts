import { KOVAALAB_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { type UniversalSyncableFlatEntity } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-entity-from.type';

export const belongsToKovaaLabCRMStandardApp = <
  T extends UniversalSyncableFlatEntity,
>({
  applicationUniversalIdentifier,
}: T) =>
  applicationUniversalIdentifier ===
  KOVAALAB_STANDARD_APPLICATION.universalIdentifier;
