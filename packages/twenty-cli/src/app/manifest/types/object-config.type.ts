import { type ObjectManifest } from 'kovaa-lab-shared/application';

export type ObjectConfig = Omit<
  ObjectManifest,
  'labelIdentifierFieldMetadataUniversalIdentifier'
> & {
  labelIdentifierFieldMetadataUniversalIdentifier?: string;
};
