import { isDefined } from 'kovaa-lab-shared/utils';

import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

// Why a call did not go through, in the terms the screen has to explain.
// 'denied' is an authorisation answer, not a technical failure: the contract
// restricts these operations to live workspace members with unrestricted
// administrator permissions and refuses API keys, apps and impersonated
// sessions.
//
// 'conflict' is deliberately one kind and not two. The server's exception
// converter turns IMPORT_BATCH_LIMIT_REACHED into extensions.code = CONFLICT
// with no subCode, so a full workspace and a reused batch id arrive on the
// wire as the same generic answer. There is nothing here to tell them apart,
// and a kind per cause would only let the screen assert one it cannot know.
export type HermesCallFailureKind =
  | 'none'
  | 'denied'
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
