import { useContext } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

import { PageLayoutSidePanelTargetContext } from '@/side-panel/pages/page-layout/contexts/PageLayoutSidePanelTargetContext';

export const usePageLayoutSidePanelTarget = () => {
  const pageLayoutSidePanelTarget = useContext(
    PageLayoutSidePanelTargetContext,
  );

  if (!isDefined(pageLayoutSidePanelTarget)) {
    throw new Error(
      doNotTranslate(
        'usePageLayoutSidePanelTarget must be used within a page layout side panel page',
      ),
    );
  }

  return pageLayoutSidePanelTarget;
};
