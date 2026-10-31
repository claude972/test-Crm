import { fireEvent, render } from '@testing-library/react';
import { i18n } from '@lingui/core';
import { generateMessageId } from 'kovaa-lab-shared/i18n';
import { useEffect, useState } from 'react';

import { ObjectFilterDropdownOptionSelect } from '@/object-record/object-filter-dropdown/components/ObjectFilterDropdownOptionSelect';
import { ObjectFilterDropdownComponentInstanceContext } from '@/object-record/object-filter-dropdown/states/contexts/ObjectFilterDropdownComponentInstanceContext';
import { fieldMetadataItemIdUsedInDropdownComponentState } from '@/object-record/object-filter-dropdown/states/fieldMetadataItemIdUsedInDropdownComponentState';
import { objectFilterDropdownCurrentRecordFilterComponentState } from '@/object-record/object-filter-dropdown/states/objectFilterDropdownCurrentRecordFilterComponentState';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { FieldMetadataType, ViewFilterOperand } from 'kovaa-lab-shared/types';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';
import { getJestMetadataAndApolloMocksWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksWrapper';

jest.mock(
  '@/object-record/object-filter-dropdown/hooks/useOptionsForSelect',
  () => ({
    useOptionsForSelect: () => ({ selectOptions: [] }),
  }),
);

jest.mock('@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement', () => ({
  useHotkeysOnFocusedElement: () => undefined,
}));

jest.mock('@/ui/layout/dropdown/hooks/useCloseDropdown', () => ({
  useCloseDropdown: () => ({ closeDropdown: jest.fn() }),
}));

jest.mock('@/ui/layout/selectable-list/hooks/useSelectableList', () => ({
  useSelectableList: () => ({
    resetSelectedItem: jest.fn(),
    setSelectedItemId: jest.fn(),
  }),
}));

const applyObjectFilterDropdownFilterValueMock = jest.fn();

jest.mock(
  '@/object-record/object-filter-dropdown/hooks/useApplyObjectFilterDropdownFilterValue',
  () => ({
    useApplyObjectFilterDropdownFilterValue: () => ({
      applyObjectFilterDropdownFilterValue:
        applyObjectFilterDropdownFilterValueMock,
    }),
  }),
);

const INSTANCE_ID = 'object-filter-dropdown-option-select-test';

const opportunity = getMockObjectMetadataItemOrThrow('opportunity');

const relationField = opportunity.fields.find(
  (field) => field.type === FieldMetadataType.RELATION,
);

const selectField = opportunity.fields.find(
  (field) =>
    field.type === FieldMetadataType.SELECT && (field.options?.length ?? 0) > 0,
);

if (!relationField || !selectField) {
  throw new Error('Missing relation or select field in opportunity mock');
}

const relationToSelectFilter: RecordFilter = {
  id: 'relation-select-filter',
  fieldMetadataId: relationField.id,
  relationTargetFieldMetadataId: selectField.id,
  type: FieldMetadataType.SELECT,
  operand: ViewFilterOperand.IS,
  value: '',
  displayValue: '',
  label: `${relationField.label} → ${selectField.label}`,
};

const BaseWrapper = getJestMetadataAndApolloMocksWrapper({ apolloMocks: [] });

const Seed = ({ children }: { children: React.ReactNode }) => {
  const setFieldMetadataItemIdUsedInDropdown = useSetAtomComponentState(
    fieldMetadataItemIdUsedInDropdownComponentState,
  );
  const setObjectFilterDropdownCurrentRecordFilter = useSetAtomComponentState(
    objectFilterDropdownCurrentRecordFilterComponentState,
  );

  const [isSeeded, setIsSeeded] = useState(false);

  useEffect(() => {
    setFieldMetadataItemIdUsedInDropdown(relationField.id);
    setObjectFilterDropdownCurrentRecordFilter(relationToSelectFilter);
    setIsSeeded(true);
  }, [
    setFieldMetadataItemIdUsedInDropdown,
    setObjectFilterDropdownCurrentRecordFilter,
  ]);

  return isSeeded ? <>{children}</> : null;
};

const Wrapper = () => (
  <BaseWrapper>
    <ObjectFilterDropdownComponentInstanceContext.Provider
      value={{ instanceId: INSTANCE_ID }}
    >
      <Seed>
        <ObjectFilterDropdownOptionSelect focusId="test-focus" />
      </Seed>
    </ObjectFilterDropdownComponentInstanceContext.Provider>
  </BaseWrapper>
);

describe('ObjectFilterDropdownOptionSelect', () => {
  it('renders the relation target field options for a relation-traversal filter', async () => {
    const { findByText, getByText } = render(<Wrapper />);

    const [firstOption, ...otherOptions] = selectField.options ?? [];

    await findByText(firstOption.label);

    for (const option of otherOptions) {
      expect(getByText(option.label)).toBeInTheDocument();
    }
  });
  // The write side must not move: what this dropdown persists is the display
  // value, and it has to stay the shipped wording whatever the viewer reads.
  it('renders the translated wording while persisting the canonical one', () => {
    const screening = (selectField.options ?? []).find(
      (option) => option.label === 'Screening',
    );

    if (!screening) {
      throw new Error('Missing the Screening option in the opportunity mock');
    }

    i18n.load('fr-FR', {
      [generateMessageId('Screening', 'fieldMetadata.label')]: 'Présélection',
    });
    i18n.activate('fr-FR');
    applyObjectFilterDropdownFilterValueMock.mockClear();

    const { getByText, queryByText } = render(<Wrapper />);

    // after: the operator reads the translated wording
    expect(getByText('Présélection')).toBeInTheDocument();
    expect(queryByText('Screening')).not.toBeInTheDocument();

    fireEvent.click(getByText('Présélection'));

    // before, and the point of the whole direction: the payload is canonical
    expect(applyObjectFilterDropdownFilterValueMock).toHaveBeenCalledWith(
      JSON.stringify([screening.value]),
      'Screening',
    );

    i18n.activate('en');
  });
});
