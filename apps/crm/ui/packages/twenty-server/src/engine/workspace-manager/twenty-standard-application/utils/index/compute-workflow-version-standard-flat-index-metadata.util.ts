import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { IndexType } from 'kovaa-lab-shared/types';
import { type AllStandardObjectIndexName } from 'src/engine/workspace-manager/kovaa-lab-standard-application/types/all-standard-object-index-name.type';
import {
  type CreateStandardIndexArgs,
  createStandardIndexFlatMetadata,
} from 'src/engine/workspace-manager/kovaa-lab-standard-application/utils/index/create-standard-index-flat-metadata.util';

export const buildWorkflowVersionStandardFlatIndexMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  kovaa-labStandardApplicationId,
}: Omit<CreateStandardIndexArgs<'workflowVersion'>, 'context'>): Record<
  AllStandardObjectIndexName<'workflowVersion'>,
  FlatIndexMetadata
> => ({
  workflowIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'workflowIdIndex',
      relatedFieldNames: ['workflow'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaa-labStandardApplicationId,
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
    kovaa-labStandardApplicationId,
    now,
  }),
});
