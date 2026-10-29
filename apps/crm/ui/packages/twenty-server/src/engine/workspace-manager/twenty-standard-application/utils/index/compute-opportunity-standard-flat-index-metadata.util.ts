import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { IndexType } from 'kovaa-lab-shared/types';
import { type AllStandardObjectIndexName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-index-name.type';
import {
  type CreateStandardIndexArgs,
  createStandardIndexFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/index/create-standard-index-flat-metadata.util';

export const buildOpportunityStandardFlatIndexMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  kovaaLabStandardApplicationId,
}: Omit<CreateStandardIndexArgs<'opportunity'>, 'context'>): Record<
  AllStandardObjectIndexName<'opportunity'>,
  FlatIndexMetadata
> => ({
  pointOfContactIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'pointOfContactIdIndex',
      relatedFieldNames: ['pointOfContact'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaaLabStandardApplicationId,
    now,
  }),
  companyIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'companyIdIndex',
      relatedFieldNames: ['company'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaaLabStandardApplicationId,
    now,
  }),
  stageIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'stageIndex',
      relatedFieldNames: ['stage'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaaLabStandardApplicationId,
    now,
  }),
  searchVectorGinIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'searchVectorGinIndex',
      relatedFieldNames: ['searchVector'],
      indexType: IndexType.GIN,
      hasDeterministicUniversalIdentifier: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaaLabStandardApplicationId,
    now,
  }),
});
