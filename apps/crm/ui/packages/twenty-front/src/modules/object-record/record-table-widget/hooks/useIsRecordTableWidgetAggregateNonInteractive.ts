import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { useContext } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

export const useIsRecordTableWidgetAggregateNonInteractive = ():
  | boolean
  | undefined => {
  const recordTableWidgetContext = useContext(RecordTableWidgetContext);

  if (!isDefined(recordTableWidgetContext)) {
    return undefined;
  }

  return !recordTableWidgetContext.isPageLayoutInEditMode;
};
