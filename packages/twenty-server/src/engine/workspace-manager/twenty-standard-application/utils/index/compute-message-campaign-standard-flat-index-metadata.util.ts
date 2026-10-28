import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { IndexType } from 'kovaa-lab-shared/types';
import { type AllStandardObjectIndexName } from 'src/engine/workspace-manager/kovaa-lab-standard-application/types/all-standard-object-index-name.type';
import {
  type CreateStandardIndexArgs,
  createStandardIndexFlatMetadata,
} from 'src/engine/workspace-manager/kovaa-lab-standard-application/utils/index/create-standard-index-flat-metadata.util';

export const buildMessageCampaignStandardFlatIndexMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  kovaa-labStandardApplicationId,
}: Omit<CreateStandardIndexArgs<'messageCampaign'>, 'context'>): Record<
  AllStandardObjectIndexName<'messageCampaign'>,
  FlatIndexMetadata
> => ({
  unsubscribeTopicIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'unsubscribeTopicIdIndex',
      relatedFieldNames: ['unsubscribeTopicId'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaa-labStandardApplicationId,
    now,
  }),
  listIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'listIdIndex',
      relatedFieldNames: ['list'],
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
