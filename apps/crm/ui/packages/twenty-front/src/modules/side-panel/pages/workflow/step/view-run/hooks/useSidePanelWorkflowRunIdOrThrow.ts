import { sidePanelWorkflowRunIdComponentState } from '@/side-panel/pages/workflow/states/sidePanelWorkflowRunIdComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isDefined } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const useSidePanelWorkflowRunIdOrThrow = () => {
  const sidePanelWorkflowRunId = useAtomComponentStateValue(
    sidePanelWorkflowRunIdComponentState,
  );
  if (!isDefined(sidePanelWorkflowRunId)) {
    throw new Error(
      doNotTranslate(
        'Expected the sidePanelWorkflowRunIdComponentState to be defined.',
      ),
    );
  }

  return sidePanelWorkflowRunId;
};
