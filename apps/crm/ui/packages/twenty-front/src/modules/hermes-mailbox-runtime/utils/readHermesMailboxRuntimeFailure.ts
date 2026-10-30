import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_MAILBOX_RUNTIME_ERROR_CODES } from '@/hermes-mailbox-runtime/constants/HermesMailboxRuntimeContract';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

// Why a mail call did not go through, in the terms the screen has to explain.
//
// - 'denied': an authorisation answer. Shown as a refusal, with nothing
//   offering to retry it as though the network had hiccuped.
// - 'notConfigured': no mailbox is connected. An explicit fact with its own
//   screen, never an empty folder.
// - 'expired': the UIDVALIDITY or the cursor this screen was holding no longer
//   matches the selected mailbox. The list is neither empty nor broken; it has
//   to be started again.
// - 'uncertain': a timeout or a connection change. For a read it is simply a
//   failure; for an emission it is the outcome the contract forbids retrying
//   blindly or under a new request id.
// - 'rejectedInput': the server refused the input. A new attempt may legally
//   carry a new request id, because nothing was reserved.
// - 'failed': everything else, with the server's own wording kept aside.
export type HermesMailboxRuntimeFailureKind =
  | 'none'
  | 'denied'
  | 'notConfigured'
  | 'expired'
  | 'uncertain'
  | 'rejectedInput'
  | 'failed';

export type HermesMailboxRuntimeFailure = {
  kind: HermesMailboxRuntimeFailureKind;
  // The server's own wording, for a folded diagnostic line. Never the
  // headline, and never parsed into an outcome beyond the codes below.
  message: string | null;
};

const readMessage = (error: unknown): string | null => {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('message' in error) ||
    typeof error.message !== 'string'
  ) {
    return null;
  }

  const trimmed = error.message.trim();

  return trimmed.length > 0 ? trimmed : null;
};

// The mail module raises its codes as Nest exception messages, so the code is
// matched on the message as well as on the GraphQL extensions. Matching is
// exact on the published constant; no code is inferred from a substring of a
// sentence this client wrote itself.
const carriesCode = (error: unknown, message: string | null, code: string) =>
  isGraphqlErrorOfType(error, code) ||
  (isDefined(message) && message.split(/[^A-Z_]+/).includes(code));

export const readHermesMailboxRuntimeFailure = (
  error: unknown,
): HermesMailboxRuntimeFailure => {
  if (!isDefined(error)) {
    return { kind: 'none', message: null };
  }

  const message = readMessage(error);

  if (isGraphqlErrorOfType(error, 'FORBIDDEN')) {
    return { kind: 'denied', message };
  }

  if (
    carriesCode(error, message, HERMES_MAILBOX_RUNTIME_ERROR_CODES.notConfigured)
  ) {
    return { kind: 'notConfigured', message };
  }

  if (
    carriesCode(
      error,
      message,
      HERMES_MAILBOX_RUNTIME_ERROR_CODES.cursorExpired,
    ) ||
    carriesCode(
      error,
      message,
      HERMES_MAILBOX_RUNTIME_ERROR_CODES.uidValidityChanged,
    )
  ) {
    return { kind: 'expired', message };
  }

  if (
    carriesCode(error, message, HERMES_MAILBOX_RUNTIME_ERROR_CODES.timeout) ||
    carriesCode(
      error,
      message,
      HERMES_MAILBOX_RUNTIME_ERROR_CODES.connectionChanged,
    )
  ) {
    return { kind: 'uncertain', message };
  }

  if (
    isGraphqlErrorOfType(error, 'BAD_USER_INPUT') ||
    isGraphqlErrorOfType(error, 'USER_INPUT_ERROR') ||
    isGraphqlErrorOfType(error, 'METADATA_VALIDATION_FAILED')
  ) {
    return { kind: 'rejectedInput', message };
  }

  return { kind: 'failed', message };
};
