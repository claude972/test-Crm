import { isDefined } from 'kovaa-lab-shared/utils';

import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

// Why a call did not go through, in the terms the screen has to explain.
//
// 'denied' is an authorisation answer, not a technical failure: it is shown as
// a refusal, and nothing on the screen offers to retry it as if the network
// had hiccuped.
//
// Everything else is 'failed'. The inbox operations publish no error taxonomy,
// so splitting technical failures into named causes here would assert
// distinctions the server never made.
export type MessagingInboxCallFailureKind =
  | 'none'
  | 'denied'
  | 'rejected-input'
  | 'failed';

export type MessagingInboxCallFailure = {
  kind: MessagingInboxCallFailureKind;
  // The server's own wording, kept for an optional folded diagnostic. Never
  // the headline.
  message: string | null;
};

export const readMessagingInboxCallFailure = (
  error: unknown,
): MessagingInboxCallFailure => {
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

  if (
    isGraphqlErrorOfType(error, 'BAD_USER_INPUT') ||
    isGraphqlErrorOfType(error, 'USER_INPUT_ERROR') ||
    isGraphqlErrorOfType(error, 'METADATA_VALIDATION_FAILED')
  ) {
    return { kind: 'rejected-input', message };
  }

  return { kind: 'failed', message };
};
