import { type ValidationRuleFieldDescriptor } from 'kovaa-lab-shared/types';
import {
  compileValidationRuleExpression,
  isNonEmptyString,
} from 'kovaa-lab-shared/utils';

import { type ValidationRuleFormValues } from '@/validation-rules/types/ValidationRuleFormValues';

export const isValidationRuleFormSubmittable = ({
  values,
  fields,
}: {
  values: ValidationRuleFormValues;
  fields: ValidationRuleFieldDescriptor[];
}): boolean =>
  isNonEmptyString(values.name.trim()) &&
  isNonEmptyString(values.message.trim()) &&
  compileValidationRuleExpression({ expression: values.expression, fields })
    .isValid;
