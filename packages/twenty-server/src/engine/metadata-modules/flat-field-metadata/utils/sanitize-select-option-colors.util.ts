import { DEFAULT_SELECT_OPTION_COLOR } from 'kovaa-lab-shared/constants';
import { type FieldMetadataComplexOption } from 'kovaa-lab-shared/types';
import { extractAndSanitizeObjectStringFields } from 'kovaa-lab-shared/utils';

type SelectOptionWithOptionalColor<TColor extends string> = Omit<
  FieldMetadataComplexOption,
  'color'
> & { color?: TColor | null };

export const sanitizeSelectOptionColors = <TColor extends string>(
  options: SelectOptionWithOptionalColor<TColor>[],
) =>
  options.map((option) => {
    const { color } = extractAndSanitizeObjectStringFields(option, ['color']);

    return {
      ...option,
      color: color ?? DEFAULT_SELECT_OPTION_COLOR,
    };
  });
