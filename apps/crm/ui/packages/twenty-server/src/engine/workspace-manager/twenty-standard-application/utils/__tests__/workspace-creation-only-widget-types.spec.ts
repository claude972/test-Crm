import { STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS } from 'kovaa-lab-shared/metadata';
import { WidgetType } from 'kovaa-lab-shared/types';

import { computeKovaaLab CRMStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/kovaa-lab-standard-application/utils/kovaa-lab-standard-application-all-flat-entity-maps.constant';

const computeStandardFlatEntityMaps = (isWorkspaceCreation?: boolean) =>
  computeKovaaLab CRMStandardApplicationAllFlatEntityMaps({
    now: '2026-09-25T00:00:00.000Z',
    workspaceId: '20202020-1111-4111-8111-111111111111',
    kovaa-labStandardApplicationId: '20202020-2222-4222-8222-222222222222',
    isWorkspaceCreation,
  }).allFlatEntityMaps;

const COMPANY_CONVERSATIONS_TAB =
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage.tabs
    .conversations;

describe('widget types only workspace creation builds', () => {
  it('should leave chat threads widgets, and the tab they fill, out of what upgrade commands build', () => {
    const allFlatEntityMaps = computeStandardFlatEntityMaps();

    const chatThreadsWidgets = Object.values(
      allFlatEntityMaps.flatPageLayoutWidgetMaps.byUniversalIdentifier,
    ).filter((widget) => widget?.type === WidgetType.CHAT_THREADS);

    expect(chatThreadsWidgets).toEqual([]);
    expect(
      allFlatEntityMaps.flatPageLayoutTabMaps.byUniversalIdentifier[
        COMPANY_CONVERSATIONS_TAB.universalIdentifier
      ],
    ).toBeUndefined();
  });

  it('should build them for a new workspace', () => {
    const allFlatEntityMaps = computeStandardFlatEntityMaps(true);

    expect(
      allFlatEntityMaps.flatPageLayoutWidgetMaps.byUniversalIdentifier[
        COMPANY_CONVERSATIONS_TAB.widgets.conversations.universalIdentifier
      ]?.type,
    ).toBe(WidgetType.CHAT_THREADS);
    expect(
      allFlatEntityMaps.flatPageLayoutTabMaps.byUniversalIdentifier[
        COMPANY_CONVERSATIONS_TAB.universalIdentifier
      ]?.widgetUniversalIdentifiers,
    ).toEqual([
      COMPANY_CONVERSATIONS_TAB.widgets.conversations.universalIdentifier,
    ]);
  });
});
