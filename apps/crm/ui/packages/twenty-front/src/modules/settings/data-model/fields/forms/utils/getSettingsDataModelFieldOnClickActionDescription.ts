import { t } from '@lingui/core/macro';
import { FieldMetadataType } from 'kovaa-lab-shared/types';
import { assertUnreachable } from 'kovaa-lab-shared/utils';

export const getSettingsDataModelFieldOnClickActionDescription = (
  fieldType:
    | FieldMetadataType.PHONES
    | FieldMetadataType.EMAILS
    | FieldMetadataType.LINKS,
) => {
  switch (fieldType) {
    case FieldMetadataType.PHONES:
      return t`Choose what happens when you click a phone number`;
    case FieldMetadataType.EMAILS:
      return t`Choose what happens when you click an email`;
    case FieldMetadataType.LINKS:
      return t`Choose what happens when you click a link`;
    default:
      assertUnreachable(fieldType, `Invalid field type: ${fieldType}`);
  }
};
