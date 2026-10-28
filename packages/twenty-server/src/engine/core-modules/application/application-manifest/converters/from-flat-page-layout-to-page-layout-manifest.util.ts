import {
  type PageLayoutManifest,
  type PageLayoutTabManifest,
} from 'kovaa-lab-shared/application';
import { isDefined, isNonEmptyArray } from 'kovaa-lab-shared/utils';

import { type UniversalFlatPageLayout } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-page-layout.type';

export const fromFlatPageLayoutToPageLayoutManifest = ({
  flatPageLayout,
  tabs = [],
}: {
  flatPageLayout: UniversalFlatPageLayout;
  tabs?: PageLayoutTabManifest[];
}): PageLayoutManifest => ({
  universalIdentifier: flatPageLayout.universalIdentifier,
  name: flatPageLayout.name,
  type: flatPageLayout.type,
  ...(isDefined(flatPageLayout.objectMetadataUniversalIdentifier)
    ? {
        objectUniversalIdentifier:
          flatPageLayout.objectMetadataUniversalIdentifier,
      }
    : {}),
  ...(isDefined(
    flatPageLayout.defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier,
  )
    ? {
        defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier:
          flatPageLayout.defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier,
      }
    : {}),
  ...(flatPageLayout.isFirstTabPinned === false
    ? { isFirstTabPinned: false }
    : {}),
  ...(isNonEmptyArray(tabs) ? { tabs } : {}),
});
