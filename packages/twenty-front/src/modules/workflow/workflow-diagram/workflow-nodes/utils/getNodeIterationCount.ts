import { getWorkflowRunAllStepInfoHistory } from '@/workflow/workflow-steps/utils/getWorkflowRunAllStepInfoHistory';
import { StepStatus, type WorkflowRunStepInfo } from 'kovaa-lab-shared/workflow';
export const getNodeIterationCount = ({
  stepInfo,
}: {
  stepInfo: WorkflowRunStepInfo;
}) => {
  const stepInfoHistory = getWorkflowRunAllStepInfoHistory({ stepInfo });

  return stepInfoHistory.filter(
    (stepInfo) =>
      stepInfo.status === StepStatus.SUCCESS ||
      stepInfo.status === StepStatus.STOPPED,
  ).length;
};
