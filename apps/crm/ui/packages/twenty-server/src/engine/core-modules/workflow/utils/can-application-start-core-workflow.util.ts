import { isDefined } from 'kovaa-lab-shared/utils';

export const canApplicationStartCoreWorkflow = ({
  callerApplicationId,
  workflowApplicationId,
}: {
  callerApplicationId: string | undefined;
  workflowApplicationId: string;
}): boolean =>
  !isDefined(callerApplicationId) ||
  workflowApplicationId === callerApplicationId;
