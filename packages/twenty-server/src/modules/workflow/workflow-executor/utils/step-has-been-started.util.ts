import { isDefined } from 'kovaa-lab-shared/utils';
import { StepStatus, type WorkflowRunStepInfos } from 'kovaa-lab-shared/workflow';

export const stepHasBeenStarted = (
  stepId: string,
  stepInfos: WorkflowRunStepInfos,
) => {
  return (
    isDefined(stepInfos[stepId]?.status) &&
    stepInfos[stepId].status !== StepStatus.NOT_STARTED
  );
};
