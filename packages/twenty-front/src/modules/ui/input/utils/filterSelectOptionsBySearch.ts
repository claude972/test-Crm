import { type SelectOption } from 'kovaa-lab-ui/primitives/input';
import { normalizeSearchText } from 'kovaa-lab-ui/utilities';

export const filterSelectOptionsBySearch = ({
  options,
  searchFilter,
}: {
  options: SelectOption[];
  searchFilter: string;
}) => {
  const searchTerm = normalizeSearchText(searchFilter);

  return options.filter((option) =>
    normalizeSearchText(option.label).includes(searchTerm),
  );
};
