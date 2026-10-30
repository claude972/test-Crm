import { isDefined } from 'kovaa-lab-shared/utils';

import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

// Why a write did not go through, in the terms the screen has to explain.
//
// 'denied' is an authorisation answer, not a technical hiccup: it is shown as
// a refusal and nothing offers to retry it.
//
// 'stale' and 'restricted' are the two refusals the policy write publishes by
// name. They are recognised from the server's own words and nothing else; the
// client never infers them from a mode comparison of its own, because that
// would be a second policy.
//
// Everything else is 'failed'. No other taxonomy is invented here.
export type HermesBotSettingsFailureKind =
  | 'none'
  | 'denied'
  | 'stale'
  | 'restricted'
  | 'rejected-input'
  | 'failed';

export type HermesBotSettingsFailure = {
  kind: HermesBotSettingsFailureKind;
  // The server's own wording, kept so a refusal can be shown with what the
  // server actually said.
  message: string | null;
};

// The two named refusals of the policy write, as the server spells them.
const STALE_TOKEN = 'BOT_POLICY_STALE';
const RESTRICTION_TOKEN = 'BOT_POLICY_RESTRICTION';

export const readHermesBotSettingsFailure = (
  error: unknown,
): HermesBotSettingsFailure => {
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

  if (isDefined(message) && message.includes(STALE_TOKEN)) {
    return { kind: 'stale', message };
  }

  if (isDefined(message) && message.includes(RESTRICTION_TOKEN)) {
    return { kind: 'restricted', message };
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
