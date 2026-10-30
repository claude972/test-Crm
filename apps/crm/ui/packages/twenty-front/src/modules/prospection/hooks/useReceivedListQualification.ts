import { useMemo } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import {
  PROSPECTION_COMPANIES_SCAN_LIMIT,
  PROSPECTION_LIST_MEMBERS_PAGE_SIZE,
} from '@/prospection/constants/ProspectionLimits';
import { useProspectionOppositionRegister } from '@/prospection/hooks/useProspectionOppositionRegister';
import { type ProspectionCount } from '@/prospection/types/ProspectionCount';
import { type ReceivedList } from '@/prospection/types/ReceivedList';
import { type ReceivedListMember } from '@/prospection/types/ReceivedListMember';
import { type ReceivedListMemberQualification } from '@/prospection/types/ReceivedListMemberQualification';
import {
  buildCoveredProspectionCount,
  exactProspectionCount,
  loadingProspectionCount,
  unavailableProspectionCount,
} from '@/prospection/utils/buildProspectionCount';
import { getProspectionOppositionState } from '@/prospection/utils/getProspectionOppositionState';

type ProspectionCompany = {
  id: string;
  name: string | null;
  __typename: string;
};

type UseReceivedListQualificationArgs = {
  messageListId: string | undefined;
};

const getDisplayName = (member: ReceivedListMember): string | null => {
  const firstName = member.person?.name?.firstName?.trim() ?? '';
  const lastName = member.person?.name?.lastName?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return isNonEmptyString(fullName) ? fullName : null;
};

export const useReceivedListQualification = ({
  messageListId,
}: UseReceivedListQualificationArgs) => {
  const {
    record: list,
    loading: listLoading,
    error: listError,
  } = useFindOneRecord<ReceivedList>({
    objectNameSingular: CoreObjectNameSingular.MessageList,
    objectRecordId: messageListId,
    recordGqlFields: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
  });

  const {
    records: members,
    totalCount: memberTotalCount,
    loading: membersLoading,
    error: membersError,
    hasNextPage: hasMoreMembers,
    fetchMoreRecords: fetchMoreMembers,
  } = useFindManyRecords<ReceivedListMember>({
    objectNameSingular: CoreObjectNameSingular.MessageListMember,
    filter: { listId: { eq: messageListId ?? '' } },
    orderBy: [{ createdAt: 'AscNullsLast' }],
    recordGqlFields: {
      id: true,
      listId: true,
      personId: true,
      createdAt: true,
      person: {
        id: true,
        name: true,
        emails: true,
        jobTitle: true,
        companyId: true,
      },
    },
    limit: PROSPECTION_LIST_MEMBERS_PAGE_SIZE,
    skip: !isNonEmptyString(messageListId),
  });

  const companyIds = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map(({ person }) => person?.companyId)
            .filter((companyId): companyId is string =>
              isNonEmptyString(companyId),
            ),
        ),
      ),
    [members],
  );

  // Companies are resolved in their own page rather than nested two levels
  // deep inside the membership query.
  const { records: companies, error: companiesError } =
    useFindManyRecords<ProspectionCompany>({
      objectNameSingular: CoreObjectNameSingular.Company,
      filter: { id: { in: companyIds } },
      recordGqlFields: { id: true, name: true },
      limit: PROSPECTION_COMPANIES_SCAN_LIMIT,
      skip: companyIds.length === 0,
    });

  const companyNameById = useMemo(
    () => new Map(companies.map(({ id, name }) => [id, name])),
    [companies],
  );

  const {
    optedOutEmails,
    coverage: oppositionCoverage,
    loading: oppositionLoading,
  } = useProspectionOppositionRegister({
    skip: !isNonEmptyString(messageListId),
  });

  const rows: ReceivedListMemberQualification[] = useMemo(
    () =>
      members.map((member) => {
        const trimmedEmail = member.person?.emails?.primaryEmail?.trim();
        const primaryEmail = isNonEmptyString(trimmedEmail)
          ? trimmedEmail
          : null;
        const companyId = member.person?.companyId ?? null;

        return {
          memberId: member.id,
          personId: member.personId ?? null,
          displayName: getDisplayName(member),
          jobTitle: member.person?.jobTitle?.trim() ?? null,
          primaryEmail,
          companyId,
          companyName: isDefined(companyId)
            ? // Undefined means the company was not in the page that was
              // read, which is not the same as a company without a name.
              (companyNameById.get(companyId) ?? null)
            : null,
          opposition: getProspectionOppositionState({
            primaryEmail,
            optedOutEmails,
            coverage: oppositionCoverage,
          }),
        };
      }),
    [members, companyNameById, optedOutEmails, oppositionCoverage],
  );

  const areRowsReadable = !isDefined(membersError);
  const coveredRows = rows.length;

  // A figure derived from the rows on screen. Unreadable rows give nothing,
  // rows still in flight give nothing either, and neither gives a zero.
  const countOver = (value: number): ProspectionCount => {
    if (!areRowsReadable) {
      return unavailableProspectionCount();
    }

    if (membersLoading) {
      return loadingProspectionCount();
    }

    return buildCoveredProspectionCount({
      value,
      covered: coveredRows,
      total: memberTotalCount,
    });
  };

  const buildContactCount = (): ProspectionCount => {
    if (!areRowsReadable) {
      return unavailableProspectionCount();
    }

    if (!isDefined(memberTotalCount)) {
      return membersLoading
        ? loadingProspectionCount()
        : unavailableProspectionCount();
    }

    return exactProspectionCount(memberTotalCount);
  };

  // Bounded by both pages: the rows read and the part of the register read.
  // Either one being short makes the figure partial, and an unreadable
  // register makes it unknown rather than zero.
  const buildOptedOutCount = (): ProspectionCount => {
    if (oppositionCoverage === 'unavailable') {
      return unavailableProspectionCount();
    }

    if (oppositionLoading) {
      return loadingProspectionCount();
    }

    const value = rows.filter(({ opposition }) => opposition === 'opted-out')
      .length;

    if (oppositionCoverage === 'partial') {
      return { status: 'partial', value, covered: coveredRows };
    }

    return countOver(value);
  };

  const contactCount = buildContactCount();

  const withEmailCount = countOver(
    rows.filter(({ primaryEmail }) => isDefined(primaryEmail)).length,
  );

  const withoutCompanyCount = !isDefined(companiesError)
    ? countOver(rows.filter(({ companyId }) => !isDefined(companyId)).length)
    : unavailableProspectionCount();

  const optedOutCount = buildOptedOutCount();

  return {
    list,
    rows,
    contactCount,
    withEmailCount,
    withoutCompanyCount,
    optedOutCount,
    oppositionCoverage,
    loading: listLoading || membersLoading || oppositionLoading,
    error: listError ?? membersError,
    hasMoreMembers,
    fetchMoreMembers,
  };
};
