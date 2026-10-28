import { isRecordTableCheckboxColumnHiddenComponentState } from '@/object-record/record-table/states/isRecordTableCheckboxColumnHiddenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useIsMobile } from 'kovaa-lab-ui/utilities';

export const useIsRecordTableCheckboxColumnHidden = (instanceId?: string) => {
  const isMobile = useIsMobile();
  const isRecordTableCheckboxColumnHidden = useAtomComponentStateValue(
    isRecordTableCheckboxColumnHiddenComponentState,
    instanceId,
  );

  return isRecordTableCheckboxColumnHidden || isMobile;
};
