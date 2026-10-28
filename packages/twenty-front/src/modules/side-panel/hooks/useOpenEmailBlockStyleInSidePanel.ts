import { t } from '@lingui/core/macro';
import { useCallback } from 'react';
import { SidePanelPages } from 'kovaa-lab-shared/types';
import { IconAdjustments } from 'kovaa-lab-ui/icon';
import { v4 } from 'uuid';

import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';

export const useOpenEmailBlockStyleInSidePanel = () => {
  const { navigateSidePanelMenu } = useSidePanelMenu();

  const openEmailBlockStyleInSidePanel = useCallback(() => {
    navigateSidePanelMenu({
      page: SidePanelPages.EmailBlockStyle,
      pageTitle: t`Block style`,
      pageIcon: IconAdjustments,
      pageId: v4(),
      resetNavigationStack: true,
    });
  }, [navigateSidePanelMenu]);

  return { openEmailBlockStyleInSidePanel };
};
