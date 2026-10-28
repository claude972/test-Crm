import { type AllFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/all-flat-entity-maps.type';
import { type MetadataToFlatEntityMapsKey } from 'src/engine/metadata-modules/flat-entity/types/metadata-to-flat-entity-maps-key.type';
import { type KOVAALAB_STANDARD_ALL_METADATA_NAME } from 'src/engine/workspace-manager/kovaa-lab-standard-application/constants/kovaa-lab-standard-all-metadata-name.constant';

export type KovaaLab CRMStandardAllFlatEntityMaps = Pick<
  AllFlatEntityMaps,
  MetadataToFlatEntityMapsKey<
    (typeof KOVAALAB_STANDARD_ALL_METADATA_NAME)[number]
  >
>;
