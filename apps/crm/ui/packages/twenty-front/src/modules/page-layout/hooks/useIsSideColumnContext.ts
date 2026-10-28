import { useIsInPinnedTab } from '@/page-layout/widgets/hooks/useIsInPinnedTab';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { useIsMobile } from 'kovaa-lab-ui/utilities';

type UseIsSideColumnContextReturn = {
  isInPinnedTab: boolean;
  isMobile: boolean;
  isSideColumnContext: boolean;
};

export const useIsSideColumnContext = (): UseIsSideColumnContextReturn => {
  const { isInPinnedTab } = useIsInPinnedTab();
  const isInSidePanel = useWorkspaceSurface().type === 'side-panel';
  const isMobile = useIsMobile();

  return {
    isInPinnedTab,
    isMobile,
    isSideColumnContext: isInPinnedTab || isMobile || isInSidePanel,
  };
};
