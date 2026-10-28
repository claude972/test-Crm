import { APPLICATION_WORKFLOW_UNAVAILABLE_STEP_TYPES } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';
import { type WorkflowActionType } from 'kovaa-lab-shared/workflow';

import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';

export const assertStepTypeAvailableToApplicationRun = ({
  stepType,
  runApplicationId,
}: {
  stepType: WorkflowActionType;
  runApplicationId?: string;
}): void => {
  if (
    !isDefined(runApplicationId) ||
    !APPLICATION_WORKFLOW_UNAVAILABLE_STEP_TYPES.includes(stepType)
  ) {
    return;
  }

  throw new WorkflowStepExecutorException(
    `Applications cannot use ${stepType} steps`,
    WorkflowStepExecutorExceptionCode.FORBIDDEN,
  );
};
