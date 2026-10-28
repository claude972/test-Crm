import { remapRecordPageUniversalIdentifiersToPre231 } from 'src/database/commands/upgrade-version-command/2-10/utils/remap-record-page-universal-identifiers-to-pre-2-31.util';
import { type KovaaLab CRMStandardAllFlatEntityMaps } from 'src/engine/workspace-manager/kovaa-lab-standard-application/types/kovaa-lab-standard-all-flat-entity-maps.type';
import {
  type ComputeKovaaLab CRMStandardApplicationAllFlatEntityMapsArgs,
  computeKovaaLab CRMStandardApplicationAllFlatEntityMaps,
} from 'src/engine/workspace-manager/kovaa-lab-standard-application/utils/kovaa-lab-standard-application-all-flat-entity-maps.constant';

// Standard definitions for upgrade commands that predate the 2-31 record-page
// reconcile: they run on workspaces whose rows still hold the pre-derivation
// universal identifiers, so the derived identifiers the shared constants now
// resolve to are remapped back to the pre-2.31 literals.
export const computeKovaaLab CRMStandardApplicationAllFlatEntityMapsPre231 = (
  args: ComputeKovaaLab CRMStandardApplicationAllFlatEntityMapsArgs,
): KovaaLab CRMStandardAllFlatEntityMaps => {
  const { allFlatEntityMaps } =
    computeKovaaLab CRMStandardApplicationAllFlatEntityMaps(args);

  return remapRecordPageUniversalIdentifiersToPre231(allFlatEntityMaps);
};
