import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { workflowVisualizerWorkflowVersionIdComponentState } from '@/workflow/states/workflowVisualizerWorkflowVersionIdComponentState';
import { isDefined } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const useWorkflowVersionIdOrThrow = () => {
  const workflowVisualizerWorkflowVersionId = useAtomComponentStateValue(
    workflowVisualizerWorkflowVersionIdComponentState,
  );

  if (!isDefined(workflowVisualizerWorkflowVersionId)) {
    throw new Error(
      doNotTranslate('Expected the workflow version ID to be defined'),
    );
  }

  return workflowVisualizerWorkflowVersionId;
};
