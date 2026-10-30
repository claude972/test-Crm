import { isNonEmptyString } from '@sniptt/guards';

import { type HermesMailboxAddress } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxAttachment } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import {
  type HermesMailboxComposeKind,
  type HermesMailboxEnvelope,
} from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { type HermesMailboxMessage } from '@/hermes-mailbox-ui/types/HermesMailboxMessage';
import { type HermesMailboxThread } from '@/hermes-mailbox-ui/types/HermesMailboxThread';
import { normalizeHermesMailboxEmail } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';

// NOT AUTHORITATIVE. The mail contract gives recipient planning to the server,
// which re-parses the original message. No component in this module calls
// anything here: the editor shows the server's envelope or says it has none.
// This is kept as an offline reference for tests and local demonstrations.

export type HermesMailboxIdentity = {
  // Every address the mailbox answers to, aliases included.
  addresses: string[];
};

export const HERMES_MAILBOX_REPLY_PREFIX = 'Re: ';
export const HERMES_MAILBOX_FORWARD_PREFIX = 'Tr: ';

const STRIPPED_SUBJECT_PREFIXES = [
  're',
  'ref',
  'rép',
  'rep',
  'fwd',
  'fw',
  'tr',
] as const;

// A forward carries the whole exchange, so it carries every file the exchange
// acquired: on a back-and-forth the contract arrived several messages ago.
// Deduplicated by id, first occurrence kept.
export const collectHermesMailboxThreadAttachments = (
  messages: HermesMailboxMessage[],
): HermesMailboxAttachment[] => {
  const seenIds = new Set<string>();
  const collected: HermesMailboxAttachment[] = [];

  for (const message of messages) {
    for (const attachment of message.attachments) {
      if (seenIds.has(attachment.id)) {
        continue;
      }

      seenIds.add(attachment.id);
      collected.push(attachment);
    }
  }

  return collected;
};

// Strips the prefixes a subject already carries, then applies this answer's,
// so a thread answered five times does not grow 'Re: Re: Re:'.
export const computeHermesMailboxSubject = (
  subject: string | null,
  kind: HermesMailboxComposeKind,
  prefixes = {
    reply: HERMES_MAILBOX_REPLY_PREFIX,
    forward: HERMES_MAILBOX_FORWARD_PREFIX,
  },
): string => {
  let remaining = (subject ?? '').trim();
  let didStrip = true;

  while (didStrip) {
    didStrip = false;

    for (const prefix of STRIPPED_SUBJECT_PREFIXES) {
      // Matches 'Re:', 're :' and 'Re[2]:', but not 'Reminder: x'.
      const pattern = new RegExp(`^${prefix}(\\s*\\[\\d+\\])?\\s*:\\s*`, 'i');

      if (pattern.test(remaining)) {
        remaining = remaining.replace(pattern, '').trim();
        didStrip = true;
      }
    }
  }

  const prefix = kind === 'forward' ? prefixes.forward : prefixes.reply;

  return isNonEmptyString(remaining) ? `${prefix}${remaining}` : prefix.trim();
};

// Everyone on Reply-To, From, To and Cc who is not us, in header order, once
// each. Bcc is never a source: a disclosed Bcc is people the sender hid from
// the thread, and copying them would expose them to all of it.
const collectExternalAddresses = (
  thread: HermesMailboxThread,
  ownAddresses: Set<string>,
): HermesMailboxAddress[] => {
  const { replyTo, from, to, cc } = thread.participants;

  const candidates = [
    ...(replyTo === null ? [] : [replyTo]),
    ...(from === null ? [] : [from]),
    ...to,
    ...cc,
  ];

  const seen = new Set<string>();
  const externals: HermesMailboxAddress[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeHermesMailboxEmail(candidate.email);

    // Both exclusions in one loop: two separate filters is how a duplicate or
    // one of our own aliases survives.
    if (
      normalized === null ||
      ownAddresses.has(normalized) ||
      seen.has(normalized)
    ) {
      continue;
    }

    seen.add(normalized);
    externals.push(candidate);
  }

  return externals;
};

export type PlanHermesMailboxEnvelopeOfflineInput = {
  kind: HermesMailboxComposeKind;
  thread: HermesMailboxThread;
  identity: HermesMailboxIdentity;
  sender: HermesMailboxEnvelope['sender'];
};

export const planHermesMailboxEnvelopeOffline = ({
  kind,
  thread,
  identity,
  sender,
}: PlanHermesMailboxEnvelopeOfflineInput): HermesMailboxEnvelope => {
  const ownAddresses = new Set(
    identity.addresses
      .map((address) => normalizeHermesMailboxEmail(address))
      .filter((address): address is string => address !== null),
  );

  const externals = collectExternalAddresses(thread, ownAddresses);

  // Reply-To wins, then From — unless From is us, which is the normal case in
  // Sent and Drafts, where answering From would mail ourselves.
  const preferred = thread.participants.replyTo ?? thread.participants.from;
  const preferredEmail = normalizeHermesMailboxEmail(preferred?.email);
  const primary =
    preferredEmail !== null && !ownAddresses.has(preferredEmail)
      ? (preferred ?? null)
      : (externals[0] ?? null);

  const primaryEmail = normalizeHermesMailboxEmail(primary?.email);
  const others =
    primaryEmail === null
      ? externals
      : externals.filter(
          (address) =>
            normalizeHermesMailboxEmail(address.email) !== primaryEmail,
        );

  return {
    kind,
    threadId: thread.id,
    sender,
    to: kind === 'forward' || primary === null ? [] : [primary],
    cc: kind === 'replyAll' ? others : [],
    subject: computeHermesMailboxSubject(thread.subject, kind),
    body: '',
    // A forward leaves with no reply references.
    inReplyTo: kind === 'forward' ? null : thread.id,
    references: [],
    attachments:
      kind === 'forward'
        ? collectHermesMailboxThreadAttachments(thread.messages)
        : [],
  };
};
