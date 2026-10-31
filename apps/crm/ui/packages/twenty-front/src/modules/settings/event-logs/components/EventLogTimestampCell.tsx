import { dateLocaleState } from '@/localization/states/dateLocaleState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { beautifyPastDateRelativeToNow } from '~/utils/date-utils';

type EventLogTimestampCellProps = {
  timestamp: string;
};

// The column list is a module constant, so the locale is read here rather than threaded through it.
export const EventLogTimestampCell = ({
  timestamp,
}: EventLogTimestampCellProps) => {
  const { localeCatalog } = useAtomStateValue(dateLocaleState);

  return <>{beautifyPastDateRelativeToNow(timestamp, localeCatalog)}</>;
};
