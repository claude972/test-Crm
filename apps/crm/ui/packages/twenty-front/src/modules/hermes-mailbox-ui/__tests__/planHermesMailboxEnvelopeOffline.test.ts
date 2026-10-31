import { type HermesMailboxAddress } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxAttachment } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import { type HermesMailboxEnvelope } from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { type HermesMailboxMessage } from '@/hermes-mailbox-ui/types/HermesMailboxMessage';
import {
  type HermesMailboxParticipants,
  type HermesMailboxThread,
} from '@/hermes-mailbox-ui/types/HermesMailboxThread';
import { parseHermesMailboxAddress } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';
import {
  collectHermesMailboxThreadAttachments,
  computeHermesMailboxSubject,
  planHermesMailboxEnvelopeOffline,
} from '@/hermes-mailbox-ui/utils/planHermesMailboxEnvelopeOffline';

// These cover the offline reference planner, which the contract does not make
// authoritative: the server plans envelopes and no component calls this. The
// cases are kept because they document the rules both sides must agree on.

const OUR_MAILBOX = 'ventes@kovaalab.example';
const OUR_ALIAS = 'contact@kovaalab.example';

const identity = { addresses: [OUR_MAILBOX, OUR_ALIAS] };

const address = (value: string): HermesMailboxAddress => {
  const parsed = parseHermesMailboxAddress(value);

  if (parsed === null) {
    throw new Error(`Unusable fixture address: ${value}`);
  }

  return parsed;
};

const sender: HermesMailboxEnvelope['sender'] = {
  address: address(OUR_MAILBOX),
  authority: { kind: 'mailbox' },
};

const attachment = (
  id: string,
  name: string | null = null,
): HermesMailboxAttachment => ({
  id,
  name,
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  availability: { kind: 'privateImportRequired' },
});

const message = (
  id: string,
  attachments: HermesMailboxAttachment[] = [],
): HermesMailboxMessage => ({
  id,
  author: null,
  occurredAt: null,
  isOutbound: null,
  isUnsentDraft: false,
  body: null,
  quote: null,
  attachments,
});

const thread = (
  // `participants` is lifted out of the Partial before being widened: left in
  // the intersection it had to satisfy the complete type as well, so a fixture
  // could only override one field by restating all of them.
  overrides: Omit<Partial<HermesMailboxThread>, 'participants'> & {
    participants?: Partial<HermesMailboxParticipants>;
  } = {},
): HermesMailboxThread => ({
  id: 'thread-1',
  subject: 'Devis chantier Nantes',
  messages: [],
  draft: null,
  isDraftIdentityUnknown: false,
  ...overrides,
  participants: {
    from: address('Claire Morel <claire@client.example>'),
    replyTo: null,
    to: [address(OUR_MAILBOX)],
    cc: [],
    bcc: { kind: 'unknown' },
    ...overrides.participants,
  },
});

const emails = (addresses: HermesMailboxAddress[]) =>
  addresses.map((entry) => entry.email);

describe('planHermesMailboxEnvelopeOffline', () => {
  describe('reply', () => {
    it('should address the correspondent and copy nobody', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'reply',
        thread: thread(),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['claire@client.example']);
      expect(envelope.cc).toEqual([]);
    });

    it('should prefer Reply-To over From', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'reply',
        thread: thread({
          participants: {
            from: address('no-reply@client.example'),
            replyTo: address('support@client.example'),
          },
        }),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['support@client.example']);
    });

    it('should never address our own mailbox or an alias', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'reply',
        thread: thread({
          participants: {
            from: address('Claire <claire@client.example>'),
            to: [address(OUR_MAILBOX), address(OUR_ALIAS)],
            cc: [address(OUR_ALIAS)],
          },
        }),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['claire@client.example']);
      expect(envelope.cc).toEqual([]);
    });

    // The Sent and Drafts case: the thread's sender is us.
    it('should fall back to the first correspondent when we are the sender', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'reply',
        thread: thread({
          participants: {
            from: address(OUR_MAILBOX),
            to: [address('claire@client.example')],
            cc: [address('paul@client.example')],
          },
        }),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['claire@client.example']);
      expect(envelope.cc).toEqual([]);
    });

    it('should match our own addresses whatever their case', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'reply',
        thread: thread({
          participants: {
            from: address('Ventes <VENTES@KovaaLab.example>'),
            to: [address('claire@client.example')],
          },
        }),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['claire@client.example']);
    });

    it('should leave no recipient when the thread has no correspondent', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'reply',
        thread: thread({
          participants: {
            from: address(OUR_MAILBOX),
            to: [address(OUR_ALIAS)],
          },
        }),
        identity,
        sender,
      });

      expect(envelope.to).toEqual([]);
      expect(envelope.cc).toEqual([]);
    });

    it('should ignore a header entry with no readable address', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'reply',
        thread: thread({
          participants: {
            from: address('Accounting Department'),
            to: [address('claire@client.example')],
          },
        }),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['claire@client.example']);
    });

    it('should carry a reply reference', () => {
      expect(
        planHermesMailboxEnvelopeOffline({
          kind: 'reply',
          thread: thread({ id: 'thread-42' }),
          identity,
          sender,
        }).inReplyTo,
      ).toBe('thread-42');
    });
  });

  describe('reply to all', () => {
    it('should copy the others without us and without duplicates', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'replyAll',
        thread: thread({
          participants: {
            from: address('Claire <claire@client.example>'),
            to: [
              address(OUR_MAILBOX),
              address('paul@client.example'),
              address('Paul <PAUL@client.example>'),
            ],
            cc: [
              address('claire@client.example'),
              address('sofia@partner.example'),
              address(OUR_ALIAS),
            ],
          },
        }),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['claire@client.example']);
      expect(emails(envelope.cc)).toEqual([
        'paul@client.example',
        'sofia@partner.example',
      ]);
    });

    it('should not copy the primary recipient as well as addressing them', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'replyAll',
        thread: thread({
          participants: {
            from: address('claire@client.example'),
            to: [address(OUR_MAILBOX), address('claire@client.example')],
            cc: [address('claire@client.example')],
          },
        }),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['claire@client.example']);
      expect(envelope.cc).toEqual([]);
    });

    // A disclosed Bcc is people the sender hid from the thread.
    it('should never promote a received Bcc into the copy list', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'replyAll',
        thread: thread({
          participants: {
            from: address('claire@client.example'),
            to: [address(OUR_MAILBOX)],
            bcc: {
              kind: 'disclosed',
              addresses: [address('legal@client.example')],
            },
          },
        }),
        identity,
        sender,
      });

      expect(envelope.cc).toEqual([]);
      expect(emails(envelope.to)).toEqual(['claire@client.example']);
    });

    it('should copy the others even from Sent, where we are the sender', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'replyAll',
        thread: thread({
          participants: {
            from: address(OUR_MAILBOX),
            to: [address('claire@client.example')],
            cc: [address('paul@client.example')],
          },
        }),
        identity,
        sender,
      });

      expect(emails(envelope.to)).toEqual(['claire@client.example']);
      expect(emails(envelope.cc)).toEqual(['paul@client.example']);
    });
  });

  describe('forward', () => {
    it('should start with no recipient and no reply reference', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'forward',
        thread: thread(),
        identity,
        sender,
      });

      expect(envelope.to).toEqual([]);
      expect(envelope.cc).toEqual([]);
      expect(envelope.inReplyTo).toBeNull();
      expect(envelope.references).toEqual([]);
    });

    it('should carry the whole thread s files, not only the last message s', () => {
      const envelope = planHermesMailboxEnvelopeOffline({
        kind: 'forward',
        thread: thread({
          messages: [
            message('m1', [attachment('a1', 'devis.pdf')]),
            message('m2', [attachment('a2', 'plan.pdf')]),
            // A one-line "thanks" carrying nothing.
            message('m3'),
          ],
        }),
        identity,
        sender,
      });

      expect(envelope.attachments.map((entry) => entry.id)).toEqual([
        'a1',
        'a2',
      ]);
    });
  });

  it('should give a reply no attachments and a forward no recipients', () => {
    const openThread = thread({
      messages: [message('m1', [attachment('a1', 'devis.pdf')])],
    });

    const reply = planHermesMailboxEnvelopeOffline({
      kind: 'reply',
      thread: openThread,
      identity,
      sender,
    });
    const forward = planHermesMailboxEnvelopeOffline({
      kind: 'forward',
      thread: openThread,
      identity,
      sender,
    });

    expect(reply.attachments).toEqual([]);
    expect(emails(reply.to)).toEqual(['claire@client.example']);
    expect(forward.attachments).toHaveLength(1);
    expect(forward.to).toEqual([]);
  });
});

describe('collectHermesMailboxThreadAttachments', () => {
  it('should return nothing for a thread with no file', () => {
    expect(collectHermesMailboxThreadAttachments([])).toEqual([]);
    expect(
      collectHermesMailboxThreadAttachments([message('m1'), message('m2')]),
    ).toEqual([]);
  });

  it('should keep the order in which the thread acquired them', () => {
    const collected = collectHermesMailboxThreadAttachments([
      message('m1', [attachment('a3'), attachment('a1')]),
      message('m2', [attachment('a2')]),
    ]);

    expect(collected.map((entry) => entry.id)).toEqual(['a3', 'a1', 'a2']);
  });

  it('should keep the first occurrence of a file quoted back later', () => {
    const collected = collectHermesMailboxThreadAttachments([
      message('m1', [attachment('a1', 'devis.pdf')]),
      message('m2', [attachment('a1', 'devis-copie.pdf')]),
    ]);

    expect(collected).toHaveLength(1);
    expect(collected[0].name).toBe('devis.pdf');
  });

  it('should deduplicate within a single message too', () => {
    const collected = collectHermesMailboxThreadAttachments([
      message('m1', [attachment('a1'), attachment('a1')]),
    ]);

    expect(collected.map((entry) => entry.id)).toEqual(['a1']);
  });

  it('should not mutate the messages it was given', () => {
    const first = message('m1', [attachment('a1')]);
    const collected = collectHermesMailboxThreadAttachments([first]);

    collected.push(attachment('a99'));

    expect(first.attachments.map((entry) => entry.id)).toEqual(['a1']);
  });
});

describe('computeHermesMailboxSubject', () => {
  const prefixes = { reply: 'Re: ', forward: 'Tr: ' };

  it('should prefix a reply and a forward differently', () => {
    expect(computeHermesMailboxSubject('Devis', 'reply', prefixes)).toBe(
      'Re: Devis',
    );
    expect(computeHermesMailboxSubject('Devis', 'forward', prefixes)).toBe(
      'Tr: Devis',
    );
  });

  it('should not stack prefixes on a thread answered many times', () => {
    expect(
      computeHermesMailboxSubject('Re: Tr: RE : Devis', 'reply', prefixes),
    ).toBe('Re: Devis');
    expect(
      computeHermesMailboxSubject('Fwd: Re[2]: Devis', 'forward', prefixes),
    ).toBe('Tr: Devis');
  });

  it('should leave a subject that merely starts with those letters alone', () => {
    expect(
      computeHermesMailboxSubject('Reminder: pay the invoice', 'reply', prefixes),
    ).toBe('Re: Reminder: pay the invoice');
  });

  it('should not glue the prefix to invented words when there is no subject', () => {
    expect(computeHermesMailboxSubject(null, 'reply', prefixes)).toBe('Re:');
  });
});
