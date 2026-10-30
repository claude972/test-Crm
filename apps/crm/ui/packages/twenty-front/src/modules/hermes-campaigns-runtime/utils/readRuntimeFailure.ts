import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';

export type HermesRuntimeFailure = {
  reasonCode: string | null;
  reason: string | null;
};

// Why a call did not go through, in the two fields every section of the
// screen renders. The classification is the prospection reader's, so a
// refusal, a conflict and a technical failure keep the same names across the
// product; the server's own sentence travels alongside it when it sent one.
//
// Nothing is invented when the error carries nothing: a null code and a null
// sentence render as "the server gave no reason", which is the truth.
export const readRuntimeFailure = (error: unknown): HermesRuntimeFailure => {
  if (!isDefined(error)) {
    return { reasonCode: null, reason: null };
  }

  const failure = readHermesCallFailure(error);

  return {
    reasonCode: failure.kind === 'none' ? null : failure.kind.toUpperCase(),
    reason: isNonEmptyString(failure.message) ? failure.message : null,
  };
};
