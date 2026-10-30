import {
  readMessagingInboxConnections,
  readMessagingInboxConversationPage,
  readMessagingInboxDraftReply,
  readMessagingInboxEmailSyncResult,
  readMessagingInboxMessage,
  readMessagingInboxMessagePage,
  readMessagingInboxReplyResult,
} from '@/messaging-inbox/utils/readMessagingInboxPayload';

describe('readMessagingInboxConversationPage', () => {
  it('does not turn an absent payload into an empty inbox', () => {
    expect(readMessagingInboxConversationPage(undefined)).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
    expect(readMessagingInboxConversationPage(null)).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
  });

  it('does not turn a payload without items into an empty inbox', () => {
    expect(readMessagingInboxConversationPage({ nextCursor: 'c1' })).toEqual({
      kind: 'unreadable',
      problem: 'malformed',
    });
  });

  it('keeps an empty page as a read, not as a failure', () => {
    expect(readMessagingInboxConversationPage({ items: [] })).toEqual({
      kind: 'read',
      value: { items: [], nextCursor: null, unreadableItemCount: 0 },
    });
  });

  it('counts an entry it had to drop instead of shortening the list silently', () => {
    const read = readMessagingInboxConversationPage({
      items: [{ id: 'conv-1', channel: 'WHATSAPP' }, { channel: 'EMAIL' }],
      nextCursor: 'cursor-2',
    });

    expect(read.kind).toBe('read');
    expect(read.kind === 'read' && read.value.items).toHaveLength(1);
    expect(read.kind === 'read' && read.value.unreadableItemCount).toBe(1);
    expect(read.kind === 'read' && read.value.nextCursor).toBe('cursor-2');
  });

  it('does not force an unpublished channel into one of the two known ones', () => {
    const read = readMessagingInboxConversationPage({
      items: [{ id: 'conv-1', channel: 'SMS' }],
    });

    expect(read.kind === 'read' && read.value.items[0].channel).toBeNull();
    expect(read.kind === 'read' && read.value.items[0].unknownChannel).toBe(
      'SMS',
    );
  });

  it('keeps an absent personId absent and shows the match status verbatim', () => {
    const read = readMessagingInboxConversationPage({
      items: [
        {
          id: 'conv-1',
          channel: 'WHATSAPP',
          personMatchStatus: 'AMBIGUOUS_NOT_LINKED',
        },
      ],
    });

    expect(read.kind === 'read' && read.value.items[0].personId).toBeNull();
    expect(
      read.kind === 'read' && read.value.items[0].personMatchStatus,
    ).toBe('AMBIGUOUS_NOT_LINKED');
  });
});

describe('readMessagingInboxMessage', () => {
  it('reads the four published statuses as known', () => {
    expect(
      readMessagingInboxMessage({ id: 'm', status: 'ACCEPTED' })?.status,
    ).toEqual({ kind: 'known', status: 'ACCEPTED' });

    expect(
      readMessagingInboxMessage({ id: 'm', status: 'UNCONFIRMED' })?.status,
    ).toEqual({ kind: 'known', status: 'UNCONFIRMED' });
  });

  it('leaves a status outside the published set unknown, kept verbatim', () => {
    expect(
      readMessagingInboxMessage({ id: 'm', status: 'DELIVERED' })?.status,
    ).toEqual({ kind: 'unknown', raw: 'DELIVERED' });
  });

  it('does not invent a status when none was sent', () => {
    expect(readMessagingInboxMessage({ id: 'm' })?.status).toEqual({
      kind: 'unknown',
      raw: null,
    });
  });

  it('leaves an unreadable direction unknown rather than guessing one', () => {
    expect(
      readMessagingInboxMessage({ id: 'm', direction: 'SIDEWAYS' })?.direction,
    ).toEqual({ kind: 'unknown', raw: 'SIDEWAYS' });

    expect(readMessagingInboxMessage({ id: 'm' })?.direction).toEqual({
      kind: 'unknown',
      raw: null,
    });
  });

  it('does not alter the inside of a message body', () => {
    expect(
      readMessagingInboxMessage({ id: 'm', text: ' hello\n  world ' })?.text,
    ).toBe(' hello\n  world ');
  });

  it('drops a message without an id', () => {
    expect(readMessagingInboxMessage({ text: 'orphan' })).toBeNull();
  });
});

describe('readMessagingInboxMessagePage', () => {
  it('does not turn a failed read into a conversation with no messages', () => {
    expect(readMessagingInboxMessagePage('not an object')).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
  });
});

describe('readMessagingInboxReplyResult', () => {
  it('does not report a send as accepted when the answer is unreadable', () => {
    expect(readMessagingInboxReplyResult(undefined)).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
    expect(readMessagingInboxReplyResult({ status: 'UNCONFIRMED' })).toEqual({
      kind: 'unreadable',
      problem: 'malformed',
    });
  });

  it('reads the message the server returned', () => {
    const read = readMessagingInboxReplyResult({
      id: 'msg-9',
      conversationId: 'conv-1',
      channel: 'WHATSAPP',
      direction: 'OUTBOUND',
      text: 'On our way.',
      status: 'UNCONFIRMED',
    });

    expect(read.kind).toBe('read');
    expect(read.kind === 'read' && read.value.id).toBe('msg-9');
    expect(read.kind === 'read' && read.value.status).toEqual({
      kind: 'known',
      status: 'UNCONFIRMED',
    });
  });
});

describe('readMessagingInboxConnections', () => {
  it('does not turn a failed read into a list of no connections', () => {
    expect(readMessagingInboxConnections(undefined)).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
    expect(readMessagingInboxConnections({ channel: 'EMAIL' })).toEqual({
      kind: 'unreadable',
      problem: 'malformed',
    });
  });

  it('keeps CONFIGURED_UNVERIFIED as its own state', () => {
    const read = readMessagingInboxConnections([
      { channel: 'WHATSAPP', state: 'CONFIGURED_UNVERIFIED' },
    ]);

    expect(read.kind === 'read' && read.value[0].state).toBe(
      'CONFIGURED_UNVERIFIED',
    );
  });

  it('defaults canSync to false and leaves canSend unknown', () => {
    const read = readMessagingInboxConnections([
      { channel: 'EMAIL', state: 'AVAILABLE' },
    ]);

    expect(read.kind === 'read' && read.value[0].canSync).toBe(false);
    expect(read.kind === 'read' && read.value[0].canSend).toBeNull();
  });

  it('reads canSend and canSync independently of the state', () => {
    const read = readMessagingInboxConnections([
      {
        channel: 'EMAIL',
        state: 'UNAVAILABLE',
        canSend: true,
        canSync: true,
      },
    ]);

    expect(read.kind === 'read' && read.value[0].canSend).toBe(true);
    expect(read.kind === 'read' && read.value[0].canSync).toBe(true);
  });
});

describe('readMessagingInboxDraftReply', () => {
  it('does not treat an unreadable answer as a proposal', () => {
    expect(readMessagingInboxDraftReply(null)).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
  });

  it('keeps MANUAL mode as no proposal even when text came along', () => {
    const read = readMessagingInboxDraftReply({
      mode: 'MANUAL',
      status: 'READY',
      provider: 'HERMES_MCP',
      text: 'unused',
    });

    expect(read.kind === 'read' && read.value.mode).toBe('MANUAL');
  });

  it('leaves an unpublished mode or status unknown', () => {
    const read = readMessagingInboxDraftReply({
      mode: 'AUTOPILOT',
      status: 'SOON',
    });

    expect(read.kind === 'read' && read.value.mode).toBeNull();
    expect(read.kind === 'read' && read.value.unknownMode).toBe('AUTOPILOT');
    expect(read.kind === 'read' && read.value.status).toBeNull();
    expect(read.kind === 'read' && read.value.unknownStatus).toBe('SOON');
  });
});

describe('readMessagingInboxEmailSyncResult', () => {
  it('does not turn an unreadable answer into a successful sync', () => {
    expect(readMessagingInboxEmailSyncResult('done')).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
  });

  it('keeps BUSY as its own state', () => {
    const read = readMessagingInboxEmailSyncResult({ state: 'BUSY' });

    expect(read.kind === 'read' && read.value.state).toBe('BUSY');
  });

  it('does not repair a count it could not read', () => {
    const read = readMessagingInboxEmailSyncResult({
      state: 'PARTIAL',
      received: 'three',
      moreAvailable: true,
    });

    expect(read.kind === 'read' && read.value.received).toBeNull();
    expect(read.kind === 'read' && read.value.moreAvailable).toBe(true);
  });
});
