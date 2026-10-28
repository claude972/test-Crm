import { isDefined } from 'kovaa-lab-shared/utils';
import { StepStatus, type WorkflowRunStepInfos } from 'kovaa-lab-shared/workflow';

import { stepShouldContinueOnFailure } from 'src/modules/workflow/workflow-executor/utils/step-should-continue-on-failure.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const stepFailedAndContinued = ({
  step,
  stepInfos,
}: {
  step: WorkflowAction;
  stepInfos: WorkflowRunStepInfos;
}): boolean => {
  const stepInfo = stepInfos[step.id];

  return (
    stepInfo?.status === StepStatus.FAILED_SAFELY &&
    isDefined(stepInfo.error) &&
    stepShouldContinueOnFailure(step)
  );
};
