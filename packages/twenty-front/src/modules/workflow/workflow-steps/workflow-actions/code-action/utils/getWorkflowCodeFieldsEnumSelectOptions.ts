import { isNonEmptyArray } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { type InputSchemaProperty } from 'kovaa-lab-shared/workflow';
import { type SelectOption } from 'kovaa-lab-ui/primitives/input';

export const getWorkflowCodeFieldsEnumSelectOptions = (
  property: InputSchemaProperty | undefined,
): SelectOption[] => {
  if (!isDefined(property) || !isNonEmptyArray(property.enum)) {
    return [];
  }

  return property.enum.map((value) => ({
    value,
    label: value,
  }));
};
