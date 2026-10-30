import { useMemo } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import {
  PROSPECTION_COMPANIES_SCAN_LIMIT,
  PROSPECTION_AUDIENCE_MEMBERS_PAGE_SIZE,
} from '@/prospection/constants/ProspectionLimits';
import { useProspectionSuppressionRegister } from '@/prospection/hooks/useProspectionSuppressionRegister';
import { type ProspectionCount } from '@/prospection/types/ProspectionCount';
import { type CampaignAudience } from '@/prospection/types/CampaignAudience';
import { type CampaignAudienceMember } from '@/prospection/types/CampaignAudienceMember';
import { type CampaignAudienceMemberRow } from '@/prospection/types/CampaignAudienceMemberRow';
import {
  buildCoveredProspectionCount,
  exactProspectionCount,
  loadingProspectionCount,
  unavailableProspectionCount,
} from '@/prospection/utils/buildProspectionCount';
import { normaliseProspectionEmail } from '@/prospection/utils/normaliseProspectionEmail';

type ProspectionCompany = {
  id: string;
  name: string | null;
  __typename: string;
};

type UseCampaignAudienceQualificationArgs = {
  messageListId: string | undefined;
};

const getDisplayName = (member: CampaignAudienceMember): string | null => {
  const firstName = member.person?.name?.firstName?.trim() ?? '';
  const lastName = member.person?.name?.lastName?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return isNonEmptyString(fullName) ? fullName : null;
};

export const useCampaignAudienceMembers = ({
  messageListId,
}: UseCampaignAudienceQualificationArgs) => {
  const {
    record: list,
    loading: listLoading,
    error: listError,
  } = useFindOneRecord<CampaignAudience>({
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
  } = useFindManyRecords<CampaignAudienceMember>({
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
    limit: PROSPECTION_AUDIENCE_MEMBERS_PAGE_SIZE,
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
    entriesByEmail,
    coverage: registerCoverage,
    isAbsenceKnown: isSuppressionAbsenceKnown,
    loading: registerLoading,
  } = useProspectionSuppressionRegister({
    skip: !isNonEmptyString(messageListId),
  });

  const rows: CampaignAudienceMemberRow[] = useMemo(
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
          // The register's entries, carried as they are: this hook decides
          // nothing about whether a message may be sent.
          suppressions: isDefined(primaryEmail)
            ? (entriesByEmail.get(normaliseProspectionEmail(primaryEmail)) ??
              [])
            : [],
          // Without an address there is nothing to look up, so the absence of
          // an entry says nothing either.
          isSuppressionAbsenceKnown:
            isSuppressionAbsenceKnown && isDefined(primaryEmail),
        };
      }),
    [
      members,
      companyNameById,
      entriesByEmail,
      isSuppressionAbsenceKnown,
    ],
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

  const contactCount = buildContactCount();

  const withEmailCount = countOver(
    rows.filter(({ primaryEmail }) => isDefined(primaryEmail)).length,
  );

  const withoutCompanyCount = !isDefined(companiesError)
    ? countOver(rows.filter(({ companyId }) => !isDefined(companyId)).length)
    : unavailableProspectionCount();

  return {
    list,
    rows,
    contactCount,
    withEmailCount,
    withoutCompanyCount,
    // Passed on so the screen can say how much of the register it read. No
    // count of "opposed" contacts is derived here: that verdict belongs to the
    // server, which combines the reason and the topic scope of each entry.
    registerCoverage,
    loading: listLoading || membersLoading || registerLoading,
    error: listError ?? membersError,
    hasMoreMembers,
    fetchMoreMembers,
  };
};
