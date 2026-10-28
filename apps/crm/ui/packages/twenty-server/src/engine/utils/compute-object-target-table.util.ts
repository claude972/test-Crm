import { KOVAALAB_STANDARD_APPLICATION } from 'src/engine/workspace-manager/kovaa-lab-standard-application/constants/kovaa-lab-standard-applications';
import { type UniversalFlatObjectMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-object-metadata.type';

import { computeTableName } from './compute-table-name.util';

export const computeObjectTargetTable = (
  objectMetadata: Pick<
    UniversalFlatObjectMetadata,
    'nameSingular' | 'applicationUniversalIdentifier'
  >,
) => {
  return computeTableName(
    objectMetadata.nameSingular,
    objectMetadata.applicationUniversalIdentifier !==
      KOVAALAB_STANDARD_APPLICATION.universalIdentifier,
  );
};
