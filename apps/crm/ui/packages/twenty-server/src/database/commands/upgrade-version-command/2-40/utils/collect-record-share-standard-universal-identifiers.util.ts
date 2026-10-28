import { STANDARD_OBJECTS } from 'kovaa-lab-shared/metadata';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type RecordShareStandardUniversalIdentifiers } from 'src/database/commands/upgrade-version-command/2-40/types/record-share-standard-universal-identifiers.type';
import { type KovaaLab CRMStandardAllFlatEntityMaps } from 'src/engine/workspace-manager/kovaa-lab-standard-application/types/kovaa-lab-standard-all-flat-entity-maps.type';

const RECORD_SHARE_OBJECT_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.recordShare.universalIdentifier;

export const collectRecordShareStandardUniversalIdentifiers = ({
  standardAllFlatEntityMaps,
}: {
  standardAllFlatEntityMaps: KovaaLab CRMStandardAllFlatEntityMaps;
}): RecordShareStandardUniversalIdentifiers => {
  const fieldMetadata = Object.values(
    standardAllFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier,
  )
    .filter(isDefined)
    .filter(
      (flatFieldMetadata) =>
        flatFieldMetadata.objectMetadataUniversalIdentifier ===
        RECORD_SHARE_OBJECT_UNIVERSAL_IDENTIFIER,
    )
    .map((flatFieldMetadata) => flatFieldMetadata.universalIdentifier);

  const index = Object.values(
    standardAllFlatEntityMaps.flatIndexMaps.byUniversalIdentifier,
  )
    .filter(isDefined)
    .filter(
      (flatIndexMetadata) =>
        flatIndexMetadata.objectMetadataUniversalIdentifier ===
        RECORD_SHARE_OBJECT_UNIVERSAL_IDENTIFIER,
    )
    .map((flatIndexMetadata) => flatIndexMetadata.universalIdentifier);

  return {
    objectMetadata: [RECORD_SHARE_OBJECT_UNIVERSAL_IDENTIFIER],
    fieldMetadata,
    index,
  };
};
