import { translateStandardSelectOptionLabel } from '@/object-metadata/utils/translateStandardSelectOptionLabel';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { t } from '@lingui/core/macro';
import { isDefined } from 'kovaa-lab-shared/utils';

export const getRecordGroupByValueLabelFromFieldValue = ({
  groupByFieldMetadataItem,
  fieldValue,
}: {
  groupByFieldMetadataItem: FieldMetadataItem;
  fieldValue: unknown;
}): string => {
  if (!isDefined(fieldValue) || fieldValue === '') return t`No Value`;

  const selectedOption = groupByFieldMetadataItem.options?.find(
    (option) => option.value === fieldValue,
  );

  if (!isDefined(selectedOption)) return t`No Value`;

  return translateStandardSelectOptionLabel({
    fieldUniversalIdentifier: groupByFieldMetadataItem.universalIdentifier,
    option: selectedOption,
  });
};
