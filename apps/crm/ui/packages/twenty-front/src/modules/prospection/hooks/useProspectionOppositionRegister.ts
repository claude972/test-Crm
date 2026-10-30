import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { PROSPECTION_OPPOSITION_SCAN_LIMIT } from '@/prospection/constants/ProspectionLimits';
import { type ProspectionOppositionCoverage } from '@/prospection/types/ProspectionOppositionState';
import { normaliseProspectionEmail } from '@/prospection/utils/getProspectionOppositionState';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import {
  FeatureFlagKey,
  MessageSuppressionsDocument,
} from '~/generated-metadata/graphql';

type UseProspectionOppositionRegisterArgs = {
  skip?: boolean;
};

// Reads the workspace opt-out register. Read-only by design: the register is
// a system object, the front never adds to it and never clears an entry.
export const useProspectionOppositionRegister = ({
  skip,
}: UseProspectionOppositionRegisterArgs = {}) => {
  // The resolver sits behind this flag, so without it the query would fail
  // rather than return an empty register.
  const isMessageCampaignEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
  );

  const isSkipped = skip === true || !isMessageCampaignEnabled;

  const { data, loading, error } = useQuery(MessageSuppressionsDocument, {
    variables: {
      input: { limit: PROSPECTION_OPPOSITION_SCAN_LIMIT, offset: 0 },
    },
    skip: isSkipped,
  });

  const records = data?.messageSuppressions.records;
  const totalCount = data?.messageSuppressions.totalCount;

  const optedOutEmails = useMemo(
    () =>
      new Set(
        (records ?? []).map(({ emailAddress }) =>
          normaliseProspectionEmail(emailAddress),
        ),
      ),
    [records],
  );

  const coverage: ProspectionOppositionCoverage = !isDefined(records)
    ? 'unavailable'
    : isDefined(totalCount) && totalCount <= records.length
      ? 'complete'
      : 'partial';

  return {
    optedOutEmails,
    coverage,
    // The register is only read when the emailing domain is on and the
    // session may read it; otherwise the opt-out column stays unknown.
    isAvailable: !isSkipped && !isDefined(error),
    loading: isSkipped ? false : loading,
    error,
  };
};
