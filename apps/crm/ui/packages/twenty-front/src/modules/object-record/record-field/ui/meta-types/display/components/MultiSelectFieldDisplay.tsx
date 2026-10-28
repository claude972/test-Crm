import { useLingui } from '@lingui/react/macro';
import { useFieldFocus } from '@/object-record/record-field/ui/hooks/useFieldFocus';
import { useMultiSelectFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useMultiSelectFieldDisplay';
import { OverflowingList } from 'kovaa-lab-ui/components/layout';
import { MultiSelectFieldDisplayTag } from '@/object-record/record-field/ui/meta-types/display/components/MultiSelectFieldDisplayTag';
import { isDefined } from 'kovaa-lab-shared/utils';

export const MultiSelectFieldDisplay = () => {
  const { t } = useLingui();

  const { fieldValue, fieldDefinition } = useMultiSelectFieldDisplay();

  const { isFocused } = useFieldFocus();

  const selectedOptions = isDefined(fieldValue)
    ? fieldDefinition.metadata.options?.filter((option) =>
        fieldValue.includes(option.value),
      )
    : [];

  if (!isDefined(selectedOptions)) return null;

  return (
    <OverflowingList
      overflowLabel={t`Show all items`}
      showOverflowCount={isFocused}
    >
      {selectedOptions.map((selectedOption, index) => (
        <MultiSelectFieldDisplayTag key={index} color={selectedOption.color}>
          {selectedOption.label}
        </MultiSelectFieldDisplayTag>
      ))}
    </OverflowingList>
  );
};
