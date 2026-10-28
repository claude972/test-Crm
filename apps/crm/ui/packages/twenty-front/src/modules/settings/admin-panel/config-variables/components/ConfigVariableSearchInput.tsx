import { t } from '@lingui/core/macro';
import { SearchInput } from 'kovaa-lab-ui/components/input';

type ConfigVariableSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export const ConfigVariableSearchInput = ({
  value,
  onChange,
}: ConfigVariableSearchInputProps) => {
  return (
    <SearchInput
      placeholder={t`Search config variables`}
      value={value}
      onValueChange={onChange}
    />
  );
};
