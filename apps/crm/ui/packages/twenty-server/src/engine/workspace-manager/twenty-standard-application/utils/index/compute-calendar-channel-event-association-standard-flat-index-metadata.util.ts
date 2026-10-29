import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type AllStandardObjectIndexName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-index-name.type';
import {
  type CreateStandardIndexArgs,
  createStandardIndexFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/index/create-standard-index-flat-metadata.util';

export const buildCalendarChannelEventAssociationStandardFlatIndexMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  kovaaLabStandardApplicationId,
}: Omit<
  CreateStandardIndexArgs<'calendarChannelEventAssociation'>,
  'context'
>): Record<
  AllStandardObjectIndexName<'calendarChannelEventAssociation'>,
  FlatIndexMetadata
> => ({
  calendarChannelIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'calendarChannelIdIndex',
      relatedFieldNames: ['calendarChannelId'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaaLabStandardApplicationId,
    now,
  }),
  calendarEventIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'calendarEventIdIndex',
      relatedFieldNames: ['calendarEvent'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaaLabStandardApplicationId,
    now,
  }),
  eventExternalIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'eventExternalIdIndex',
      relatedFieldNames: ['eventExternalId'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    kovaaLabStandardApplicationId,
    now,
  }),
});
