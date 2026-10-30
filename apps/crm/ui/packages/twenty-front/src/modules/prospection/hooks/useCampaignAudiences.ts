import { useMemo } from 'react';
import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import {
  PROSPECTION_AUDIENCE_MEMBERS_SCAN_LIMIT,
  PROSPECTION_CAMPAIGN_AUDIENCES_PAGE_SIZE,
} from '@/prospection/constants/ProspectionLimits';
import { type ProspectionCount } from '@/prospection/types/ProspectionCount';
import { type CampaignAudience } from '@/prospection/types/CampaignAudience';
import { type CampaignAudienceMember } from '@/prospection/types/CampaignAudienceMember';
import {
  buildCoveredProspectionCount,
  exactProspectionCount,
  loadingProspectionCount,
  unavailableProspectionCount,
} from '@/prospection/utils/buildProspectionCount';

export type CampaignAudienceRow = {
  list: CampaignAudience;
  contactCount: ProspectionCount;
};

// The campaign audience lists of this workspace, newest first, with a contact
// count per audience. These lists are already-qualified campaign audiences;
// incoming batches live in the Hermes reception, not here. The counts come from
// one extra page of memberships rather than one query per row, so they are
// exact only while that page covers them.
export const useCampaignAudiences = () => {
  const {
    records: lists,
    totalCount: listTotalCount,
    loading: listsLoading,
    error: listsError,
    hasNextPage: hasMoreLists,
    fetchMoreRecords: fetchMoreLists,
  } = useFindManyRecords<CampaignAudience>({
    objectNameSingular: CoreObjectNameSingular.MessageList,
    orderBy: [{ createdAt: 'DescNullsLast' }],
    recordGqlFields: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
    limit: PROSPECTION_CAMPAIGN_AUDIENCES_PAGE_SIZE,
  });

  const listIds = lists.map(({ id }) => id);

  const {
    records: members,
    totalCount: memberTotalCount,
    loading: membersLoading,
    error: membersError,
  } = useFindManyRecords<CampaignAudienceMember>({
    objectNameSingular: CoreObjectNameSingular.MessageListMember,
    filter: { listId: { in: listIds } },
    recordGqlFields: { id: true, listId: true },
    limit: PROSPECTION_AUDIENCE_MEMBERS_SCAN_LIMIT,
    skip: listIds.length === 0,
  });

  const countByListId = useMemo(() => {
    const counts = new Map<string, number>();

    members.forEach(({ listId }) => {
      if (isDefined(listId)) {
        counts.set(listId, (counts.get(listId) ?? 0) + 1);
      }
    });

    return counts;
  }, [members]);

  const areCountsReadable = !isDefined(membersError);

  // While the membership page is in flight no count is known yet, and an
  // unknown count must not render as 0.
  const buildContactCount = (value: number): ProspectionCount =>
    !areCountsReadable
      ? unavailableProspectionCount()
      : membersLoading
        ? loadingProspectionCount()
        : buildCoveredProspectionCount({
            value,
            covered: members.length,
            total: memberTotalCount,
          });

  const rows: CampaignAudienceRow[] = lists.map((list) => ({
    list,
    contactCount: buildContactCount(countByListId.get(list.id) ?? 0),
  }));

  // The server returns the count for the whole filter, not for the page on
  // screen, so this one is exact as soon as it arrives.
  const buildListCount = (): ProspectionCount => {
    if (isDefined(listTotalCount)) {
      return exactProspectionCount(listTotalCount);
    }

    return listsLoading
      ? loadingProspectionCount()
      : unavailableProspectionCount();
  };

  // Contacts are counted across the lists on screen, so the figure is exact
  // only once every list has been loaded.
  const buildTotalContactCount = (): ProspectionCount => {
    if (!areCountsReadable) {
      return unavailableProspectionCount();
    }

    // No list means no contact: a real zero, not a skipped query.
    if (listTotalCount === 0) {
      return exactProspectionCount(0);
    }

    if (!isDefined(memberTotalCount)) {
      return listsLoading || membersLoading
        ? loadingProspectionCount()
        : unavailableProspectionCount();
    }

    return buildCoveredProspectionCount({
      value: memberTotalCount,
      covered: lists.length,
      total: listTotalCount,
    });
  };

  return {
    rows,
    listCount: buildListCount(),
    contactCount: buildTotalContactCount(),
    loading: listsLoading || membersLoading,
    error: listsError,
    hasMoreLists,
    fetchMoreLists,
  };
};
