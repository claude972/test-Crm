import { type ObjectPermissions } from 'kovaa-lab-shared/types';

export type ObjectPermissionsWithObjectMetadataId = ObjectPermissions & {
  objectMetadataId: string;
};
