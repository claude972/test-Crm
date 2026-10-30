import { isDefined } from 'kovaa-lab-shared/utils';

import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

// Why a runtime write did not go through, in the only terms this screen is
// allowed to use.
//
// 'session-replaced' is the backend's own named refusal: `UNAUTHENTICATED`
// carrying `subCode = SESSION_SUPERSEDED`. It is an ANSWER, not a breakdown.
// It is never retried here — the contract forbids an automatic retry — and it
// is never folded into a generic refusal, because the operator has to be told
// to reload rather than left to click again.
//
// 'stale' is CONNECTION_REVISION_CONFLICT: someone else's decision landed
// first. It is also never retried automatically; a retry would be this screen
// deciding whose write wins.
export type HermesRuntimeFailureKind =
  | 'none'
  | 'session-replaced'
  | 'stale'
  | 'denied'
  | 'rejected-input'
  | 'failed';

export type HermesRuntimeFailure = {
  kind: HermesRuntimeFailureKind;
  // The server's own wording, kept so a refusal is shown with what the server
  // actually said instead of a sentence invented here.
  message: string | null;
};

const SESSION_SUPERSEDED_TOKEN = 'SESSION_SUPERSEDED';
const REVISION_CONFLICT_TOKEN = 'CONNECTION_REVISION_CONFLICT';

// The named refusals that must stay legible rather than be flattened into
// « failed »: each one tells the operator something different to do.
const NAMED_REFUSAL_TOKENS = [
  'NEW_OWNER_REQUIRES_SECRETS',
  'MAIL_ACCOUNT_CHANGED',
] as const;

const readMessage = (error: unknown): string | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
  ) {
    return error.message.trim();
  }

  return null;
};

export const readHermesRuntimeFailure = (
  error: unknown,
): HermesRuntimeFailure => {
  if (!isDefined(error)) {
    return { kind: 'none', message: null };
  }

  const message = readMessage(error);

  if (
    // `isGraphqlErrorOfType` already looks at `extensions.subCode`, which is
    // where the supersession is published by name.
    isGraphqlErrorOfType(error, SESSION_SUPERSEDED_TOKEN) ||
    (isDefined(message) && message.includes(SESSION_SUPERSEDED_TOKEN))
  ) {
    return { kind: 'session-replaced', message };
  }

  if (isDefined(message) && message.includes(REVISION_CONFLICT_TOKEN)) {
    return { kind: 'stale', message };
  }

  if (isGraphqlErrorOfType(error, 'FORBIDDEN')) {
    return { kind: 'denied', message };
  }

  if (
    isDefined(message) &&
    NAMED_REFUSAL_TOKENS.some((token) => message.includes(token))
  ) {
    return { kind: 'rejected-input', message };
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
