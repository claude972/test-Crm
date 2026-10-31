import {
  type MessagingInboxCallFailure,
  readMessagingInboxCallFailure,
} from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

// Why the server refused a bot-policy write, in its own vocabulary.
//
// These four are ConflictException on the server, so they arrive with
// `extensions.code === 'CONFLICT'` and the code itself as the message — not
// FORBIDDEN and not BAD_USER_INPUT. The generic failure reader therefore calls
// them 'failed', which would put "something went wrong" on a refusal the
// server made deliberately. They are named here so each gets its own sentence.
export const MESSAGING_INBOX_POLICY_REFUSAL_CODES = [
  'BOT_POLICY_STALE',
  'BOT_POLICY_RESTRICTION',
  'BOT_DELEGATION_REQUIRED',
  'CONVERSATION_CONTACT_REVIEW_REQUIRED',
  'CONVERSATION_NOT_FOUND',
] as const;

export type MessagingInboxPolicyRefusalCode =
  (typeof MESSAGING_INBOX_POLICY_REFUSAL_CODES)[number];

export type MessagingInboxPolicyRefusal = {
  // The generic reading, kept so an authorisation refusal stays an
  // authorisation refusal and a transport failure stays a failure.
  failure: MessagingInboxCallFailure;
  // The server's named precondition, when it published one. Null means it did
  // not, and nothing here guesses which one it might have meant.
  code: MessagingInboxPolicyRefusalCode | null;
};

export const readMessagingInboxPolicyRefusal = (
  error: unknown,
): MessagingInboxPolicyRefusal => {
  const failure = readMessagingInboxCallFailure(error);

  if (failure.message === null) {
    return { failure, code: null };
  }

  const normalised = failure.message.toUpperCase();

  // Matched by containment, not equality: the transport may prefix the
  // server's message, and a code that is present is present.
  const code =
    MESSAGING_INBOX_POLICY_REFUSAL_CODES.find((candidate) =>
      normalised.includes(candidate),
    ) ?? null;

  return { failure, code };
};
