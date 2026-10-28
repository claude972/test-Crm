import { useLingui } from '@lingui/react/macro';
import { ListItemButton } from 'kovaa-lab-ui/components/navigation';
import { IconRefresh } from 'kovaa-lab-ui/icon';
import { useTheme } from 'kovaa-lab-ui/theme';

import { type useRecordSharing } from '@/object-record/record-sharing/hooks/useRecordSharing';
import { ListItemIconContainer } from '@/ui/navigation/list-item/components/ListItemIconContainer';

type SidePanelShareRecordRetryItemProps = {
  refetch: ReturnType<typeof useRecordSharing>['refetch'];
};

export const SidePanelShareRecordRetryItem = ({
  refetch,
}: SidePanelShareRecordRetryItemProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const handleRetry = () => {
    void refetch().catch(() => {});
  };

  return (
    <ListItemButton
      startIcon={
        <ListItemIconContainer>
          <IconRefresh
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
        </ListItemIconContainer>
      }
      onClick={handleRetry}
    >
      {t`Try again`}
    </ListItemButton>
  );
};
