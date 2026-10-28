import { type LogicFunctionFormValues } from '@/logic-functions/hooks/useLogicFunctionUpdateFormState';
import {
  jsonSchemaToInputSchema,
  type InputJsonSchema,
} from 'kovaa-lab-shared/logic-function';
import { isDefined } from 'kovaa-lab-shared/utils';

export const buildTriggerSettingsWithInputSchema = ({
  formValues,
  inferredJsonSchema,
}: {
  formValues: Pick<
    LogicFunctionFormValues,
    'toolTriggerSettings' | 'workflowActionTriggerSettings'
  >;
  inferredJsonSchema: InputJsonSchema;
}): Pick<
  LogicFunctionFormValues,
  'toolTriggerSettings' | 'workflowActionTriggerSettings'
> => ({
  toolTriggerSettings: isDefined(formValues.toolTriggerSettings)
    ? {
        ...formValues.toolTriggerSettings,
        inputSchema: inferredJsonSchema,
      }
    : null,
  workflowActionTriggerSettings: isDefined(
    formValues.workflowActionTriggerSettings,
  )
    ? {
        ...formValues.workflowActionTriggerSettings,
        inputSchema: jsonSchemaToInputSchema(inferredJsonSchema),
      }
    : null,
});
