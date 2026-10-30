import { isDefined } from 'kovaa-lab-shared/utils';

import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

// Why a call did not go through, in the terms the screen has to explain.
// 'denied' is an authorisation answer, not a technical failure: the contract
// restricts these operations to live workspace members with unrestricted
// administrator permissions and refuses API keys, apps and impersonated
// sessions.
//
// A 409 is NOT always the idempotency answer: the retention bound answers 409
// too, so the two are separated and an unattributed conflict says only that it
// is a conflict. Claiming "same batch id" for a full workspace would send
// someone to change an id that was never the problem.
export type HermesCallFailureKind =
  | 'none'
  | 'denied'
  | 'retention-limit'
  | 'conflict'
  | 'rejected-input'
  | 'failed';

export type HermesCallFailure = {
  kind: HermesCallFailureKind;
  // Server wording, kept for an optional folded diagnostic. Never the headline.
  message: string | null;
};

export const readHermesCallFailure = (error: unknown): HermesCallFailure => {
  if (!isDefined(error)) {
    return { kind: 'none', message: null };
  }

  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
      ? error.message.trim()
      : null;

  if (isGraphqlErrorOfType(error, 'FORBIDDEN')) {
    return { kind: 'denied', message };
  }

  // Checked before CONFLICT: this one is also a 409, and it is the answer that
  // carries its own named code.
  if (isGraphqlErrorOfType(error, 'IMPORT_BATCH_LIMIT_REACHED')) {
    return { kind: 'retention-limit', message };
  }

  if (isGraphqlErrorOfType(error, 'CONFLICT')) {
    return { kind: 'conflict', message };
  }

  if (
    isGraphqlErrorOfType(error, 'BAD_USER_INPUT') ||
    isGraphqlErrorOfType(error, 'USER_INPUT_ERROR') ||
    isGraphqlErrorOfType(error, 'METADATA_VALIDATION_FAILED')
  ) {
    return { kind: 'rejected-input', message };
  }

  return { kind: 'failed', message };
};
