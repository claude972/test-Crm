import { type FieldAddressValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { isNonEmptyString } from '@sniptt/guards';
import { type AllowedAddressSubField } from 'kovaa-lab-shared/types';

export const joinAddressFieldValues = (
  fieldValue: FieldAddressValue,
  subFields: AllowedAddressSubField[],
) => {
  return subFields
    .map((subField) => fieldValue[subField])
    .filter(isNonEmptyString)
    .join(', ');
};
