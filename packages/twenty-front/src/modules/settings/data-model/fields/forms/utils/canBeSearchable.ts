import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { FieldMetadataType } from 'kovaa-lab-shared/types';
import { isSearchableFieldType } from 'kovaa-lab-shared/utils';

export const canBeSearchable = (
  field: Pick<FieldMetadataItem, 'type' | 'name'>,
) =>
  isSearchableFieldType(field.type) &&
  field.type !== FieldMetadataType.UUID &&
  field.name !== 'id';
