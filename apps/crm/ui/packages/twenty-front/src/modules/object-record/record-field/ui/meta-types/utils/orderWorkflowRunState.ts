import { type WorkflowRunState } from '@/workflow/types/Workflow';
import { isDefined } from 'kovaa-lab-shared/utils';
import { workflowRunStateSchema } from 'kovaa-lab-shared/workflow';
import { type JsonValue } from 'type-fest';

export const orderWorkflowRunState = (value: JsonValue) => {
  const parsedValue = workflowRunStateSchema.safeParse(value);
  if (!parsedValue.success) {
    return null;
  }

  const orderedWorkflowRunState: WorkflowRunState = {
    ...(isDefined(parsedValue.data.workflowRunError)
      ? {
          workflowRunError: parsedValue.data.workflowRunError,
        }
      : {}),
    stepInfos: parsedValue.data.stepInfos,
    flow: parsedValue.data.flow,
  };

  return orderedWorkflowRunState;
};
