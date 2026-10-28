import { type AllMetadataName } from 'kovaa-lab-shared/metadata';

import { type MetadataValidationRelatedUniversalFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/metadata-related-types.type';
import { type StandardObjectMetadataRelatedEntityIds } from 'src/engine/workspace-manager/kovaa-lab-standard-application/utils/get-standard-object-metadata-related-entity-ids.util';
import { type ComputeKovaaLab CRMStandardApplicationAllFlatEntityMapsArgs } from 'src/engine/workspace-manager/kovaa-lab-standard-application/utils/kovaa-lab-standard-application-all-flat-entity-maps.constant';

export type StandardBuilderArgs<T extends AllMetadataName> = {
  standardObjectMetadataRelatedEntityIds: StandardObjectMetadataRelatedEntityIds;
  dependencyFlatEntityMaps: MetadataValidationRelatedUniversalFlatEntityMaps<T>;
} & ComputeKovaaLab CRMStandardApplicationAllFlatEntityMapsArgs;
