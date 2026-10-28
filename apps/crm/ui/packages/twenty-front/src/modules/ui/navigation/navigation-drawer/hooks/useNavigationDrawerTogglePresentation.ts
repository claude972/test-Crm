import { useLingui } from '@lingui/react/macro';
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
} from 'kovaa-lab-ui/icon';

export const useNavigationDrawerTogglePresentation = (
  isNavigationDrawerExpanded: boolean,
) => {
  const { t } = useLingui();

  return isNavigationDrawerExpanded
    ? { label: t`Collapse sidebar`, Icon: IconLayoutSidebarLeftCollapse }
    : { label: t`Expand sidebar`, Icon: IconLayoutSidebarRightCollapse };
};
