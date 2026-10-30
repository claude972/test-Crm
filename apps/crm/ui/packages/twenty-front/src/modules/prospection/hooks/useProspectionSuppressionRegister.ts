import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { PROSPECTION_SUPPRESSION_SCAN_LIMIT } from '@/prospection/constants/ProspectionLimits';
import {
  type ProspectionRegisterCoverage,
  type ProspectionSuppressionEntry,
} from '@/prospection/types/ProspectionSuppressionEntry';
import { normaliseProspectionEmail } from '@/prospection/utils/normaliseProspectionEmail';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import {
  FeatureFlagKey,
  MessageSuppressionsDocument,
} from '~/generated-metadata/graphql';

type UseProspectionSuppressionRegisterArgs = {
  skip?: boolean;
};

// Reads the workspace suppression register and hands its entries over
// unchanged, grouped by address.
//
// It deliberately computes no verdict. Whether an entry blocks a send depends
// on its reason and on its topic scope, and the server owns that rule:
// tracking-only entries block nothing, bounces and complaints block
// everything, an unsubscribe without a topic is the global one, and an
// unsubscribe with a topic limits itself to that topic. Collapsing all of that
// into one "opted out" flag is the defect this hook replaces.
//
// Read-only by design: the register is a system object, the front never adds
// to it and never clears an entry.
export const useProspectionSuppressionRegister = ({
  skip,
}: UseProspectionSuppressionRegisterArgs = {}) => {
  // The resolver sits behind this flag, so without it the query would fail
  // rather than return an empty register.
  const isMessageCampaignEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
  );

  const isSkipped = skip === true || !isMessageCampaignEnabled;

  const { data, loading, error } = useQuery(MessageSuppressionsDocument, {
    variables: {
      input: { limit: PROSPECTION_SUPPRESSION_SCAN_LIMIT, offset: 0 },
    },
    skip: isSkipped,
  });

  const records = data?.messageSuppressions.records;
  const totalCount = data?.messageSuppressions.totalCount;

  const entriesByEmail = useMemo(() => {
    const entries = new Map<string, ProspectionSuppressionEntry[]>();

    (records ?? []).forEach((record) => {
      const key = normaliseProspectionEmail(record.emailAddress);
      const entry: ProspectionSuppressionEntry = {
        id: record.id,
        reason: record.reason,
        unsubscribeTopicId: record.unsubscribeTopicId ?? null,
        createdAt: record.createdAt,
      };

      entries.set(key, [...(entries.get(key) ?? []), entry]);
    });

    return entries;
  }, [records]);

  const coverage: ProspectionRegisterCoverage = !isDefined(records)
    ? 'unavailable'
    : isDefined(totalCount) && totalCount <= records.length
      ? 'complete'
      : 'partial';

  return {
    entriesByEmail,
    coverage,
    // Only with a fully read register does the absence of an entry mean
    // anything at all.
    isAbsenceKnown: coverage === 'complete' && !isDefined(error),
    loading: isSkipped ? false : loading,
    error,
  };
};
