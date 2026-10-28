import { type WorkflowRunStepInfo } from 'kovaa-lab-shared/workflow';

export const getStepRetryAttempt = ({
  stepInfo,
}: {
  stepInfo?: WorkflowRunStepInfo;
}): number => {
  const history = stepInfo?.history ?? [];

  return history[history.length - 1]?.retryAttempt ?? 0;
};
