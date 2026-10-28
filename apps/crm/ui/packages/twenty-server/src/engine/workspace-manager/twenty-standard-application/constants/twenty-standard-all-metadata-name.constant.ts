import { type AllMetadataName } from 'kovaa-lab-shared/metadata';

export const KOVAALAB_STANDARD_ALL_METADATA_NAME = [
  'index',
  'searchFieldMetadata',
  'objectMetadata',
  'fieldMetadata',
  'viewField',
  'viewFieldGroup',
  'viewFilter',
  'viewGroup',
  'view',
  'navigationMenuItem',
  'permissionFlag',
  'role',
  'agent',
  'skill',
  'pageLayout',
  'pageLayoutTab',
  'pageLayoutWidget',
  'commandMenuItem',
  'timelineActivityType',
  'agentChatChannel',
] as const satisfies AllMetadataName[];
