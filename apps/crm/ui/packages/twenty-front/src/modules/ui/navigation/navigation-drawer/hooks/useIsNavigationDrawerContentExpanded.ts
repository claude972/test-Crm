import { useNavigationDrawerExpanded } from '@/ui/navigation/navigation-drawer/hooks/useNavigationDrawerExpanded';
import { useIsMobile } from 'kovaa-lab-ui/utilities';

// For the content (useNavigationDrawerExpanded is for the drawer container); mobile has no icon rail, so it always renders expanded there.
export const useIsNavigationDrawerContentExpanded = () => {
  const isMobile = useIsMobile();
  const isNavigationDrawerExpanded = useNavigationDrawerExpanded();

  return isNavigationDrawerExpanded || isMobile;
};
