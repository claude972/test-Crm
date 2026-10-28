import { type FieldMetadataItemOption } from '@/object-metadata/types/FieldMetadataItem';
import { DEFAULT_SELECT_OPTION_COLOR } from 'kovaa-lab-shared/constants';
import { isTagColor } from 'kovaa-lab-shared/utils';

type SelectOptionWithOptionalColor = Omit<FieldMetadataItemOption, 'color'> & {
  color?: string | null;
};

export const normalizeSelectOptions = (
  options: readonly SelectOptionWithOptionalColor[],
): FieldMetadataItemOption[] =>
  options
    .map((option) => ({
      ...option,
      color: isTagColor(option.color)
        ? option.color
        : DEFAULT_SELECT_OPTION_COLOR,
    }))
    .sort((optionA, optionB) => optionA.position - optionB.position);
