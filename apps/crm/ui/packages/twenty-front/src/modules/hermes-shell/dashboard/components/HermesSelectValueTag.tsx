import { useLingui } from '@lingui/react/macro';

import { isDefined } from 'kovaa-lab-shared/utils';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';

import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';

type HermesSelectValueTagProps = {
  fieldMetadataItem: FieldMetadataItem;
  value: unknown;
};

export const HermesSelectValueTag = ({
  fieldMetadataItem,
  value,
}: HermesSelectValueTagProps) => {
  const { t } = useLingui();

  if (typeof value !== 'string' || value === '') {
    // An empty select is empty, not a status. Dashed and worded so it cannot
    // be mistaken for one of the real options.
    // variant="outline" is required for the dash to be painted at all: Tag
    // draws no border under the other variants, which would leave this state
    // separated from the real ones by hue alone.
    return (
      <Tag
        color="transparent"
        variant="outline"
        borderStyle="dashed"
        truncate={false}
      >
        {t`Not set`}
      </Tag>
    );
  }

  const option = fieldMetadataItem.options?.find(
    (candidate) => candidate.value === value,
  );

  // A value with no matching option is shown as it is stored rather than
  // silently dropped or relabelled: the label always carries the meaning, the
  // colour only reinforces it.
  if (!isDefined(option)) {
    return (
      <Tag color="gray" variant="outline" truncate={false}>
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      color={option.color}
      variant="soft"
      weight="medium"
      truncate={false}
    >
      {option.label}
    </Tag>
  );
};
