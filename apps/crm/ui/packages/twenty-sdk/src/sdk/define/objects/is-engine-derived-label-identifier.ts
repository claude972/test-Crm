import { isDefined } from 'kovaa-lab-shared/utils';

export const isEngineDerivedLabelIdentifier = ({
  fields,
  labelIdentifierFieldMetadataUniversalIdentifier,
}: {
  fields: { universalIdentifier?: string }[];
  labelIdentifierFieldMetadataUniversalIdentifier?: string;
}): boolean =>
  isDefined(labelIdentifierFieldMetadataUniversalIdentifier) &&
  !fields.some(
    (field) =>
      field.universalIdentifier ===
      labelIdentifierFieldMetadataUniversalIdentifier,
  );
