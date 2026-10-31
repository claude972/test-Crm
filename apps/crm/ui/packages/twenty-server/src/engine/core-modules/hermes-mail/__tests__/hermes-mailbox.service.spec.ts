beforeEach(() => jest.useRealTimers());
jest.mock(
  'src/engine/core-modules/hermes-messaging/hermes-messaging-person.service',
  () => ({ HermesMessagingPersonService: class {} }),
);
jest.mock('src/engine/core-modules/hermes-mail/hermes-mail.service', () => ({
  HermesMailService: class {},
}));
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service',
  () => ({ HermesProspectionAccessService: class {} }),
);
jest.mock(
  'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider',
  () => ({ ImapClientProvider: class {} }),
);
import PostalMime from 'postal-mime';
import MailComposer from 'nodemailer/lib/mail-composer';
import { messagingId } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.policy';
import { HermesMailboxService } from 'src/engine/core-modules/hermes-mail/hermes-mailbox.service';
const actor = {
  workspaceId: 'f2c96b7b-f314-4561-9b5c-0011cfe03fd0',
  userId: 'eb92012d-703f-44b8-b968-10477e5cc020',
  userWorkspaceId: 'ff2293ce-ac4b-4717-a914-43492ccc0b02',
};
const scope = { folder: 'INBOX', uid: '12', uidValidity: '123' };
function fixture() {
  const account = {
    id: 'mail-account',
    handle: 'me@example.com',
    userWorkspaceId: actor.userWorkspaceId,
  };
  const item = { account, binding: { connectionId: 'mail' } };
  const raw = Buffer.from(
    'From: sender@example.org\r\nTo: me@example.com\r\nBcc: private@example.org\r\nMessage-ID: <source@example.org>\r\nSubject: Question\r\nContent-Type: text/html\r\n\r\n<p>Hello</p><img src="https://track.example.org/x">',
  );
  const release = jest.fn();
  const client = {
    capabilities: new Map([['MOVE', true]]),
    enabled: new Set<string>(),
    mailbox: { uidValidity: 123n },
    getMailboxLock: jest.fn(async () => ({ release })),
    list: jest.fn(async () => [
      { path: 'INBOX', name: 'Inbox', flags: new Set(), specialUse: '' },
      {
        path: 'Drafts',
        name: 'Drafts',
        flags: new Set(),
        specialUse: '\\Drafts',
      },
      {
        path: 'Parent',
        name: 'Parent',
        flags: new Set(['\\Noselect']),
        specialUse: '',
      },
    ]),
    status: jest.fn(async () => ({ messages: 5 })),
    search: jest.fn(async () => [11, 12, 13]),
    fetchAll: jest.fn(async () => [
      { uid: 13, envelope: { subject: 'Hello' }, flags: new Set(['\\Seen']) },
    ]),
    fetchOne: jest.fn(async (_uid: string, query: { source?: unknown }) =>
      query.source ? { uid: 12, source: raw } : { uid: 12, size: raw.length },
    ),
    messageFlagsAdd: jest.fn(async () => true),
    messageFlagsRemove: jest.fn(async () => true),
    messageMove: jest.fn(async () => ({ uidMap: new Map() })),
    append: jest.fn(async () => ({ uid: 50, uidValidity: 456n })),
    close: jest.fn(),
  };
  const access = { assertAllowed: jest.fn(async () => undefined) };
  const mail = {
    connection: jest.fn(async () => item),
    withDraftLock: jest.fn(
      async (_actor: unknown, _draftId: string, run: () => Promise<unknown>) =>
        run(),
    ),
    draftAttachments: jest.fn(
      async (_actor: unknown, _conversationId: string, ids: string[]) => {
        if (ids.length) throw new Error('MEDIA_SCOPE_INVALID');
        return [];
      },
    ),
    draftConversation: jest.fn(async () => ({ id: 'canonical' })),
    replyRich: jest.fn(async () => ({ id: 'sent', status: 'ACCEPTED' })),
    observe: jest.fn(async () => ({
      conversationId: 'canonical',
      messageId: 'message',
      providerConnectionId: 'mail',
      direction: 'INBOUND',
      attachments: [],
    })),
  };
  const imap = {
    getClient: jest.fn(async () => client),
    closeClient: jest.fn(async () => undefined),
  };
  const service = new HermesMailboxService(
    mail as never,
    imap as never,
    access as never,
  );
  return { service, mail, imap, client, access, account, release };
}
describe('native mailbox APIs', () => {
  it('reports absence of configuration without making provider calls', async () => {
    const f = fixture();
    f.mail.connection.mockResolvedValue(null as never);
    expect(await f.service.folders(actor)).toEqual({
      state: 'NOT_CONFIGURED',
      folders: [],
    });
    expect(f.imap.getClient).not.toHaveBeenCalled();
  });
  it('preserves unknown unread count instead of inventing zero', async () => {
    const f = fixture();
    expect(await f.service.folders(actor)).toMatchObject({
      folders: [
        { role: 'INBOX', unread: null, total: 5 },
        { role: 'DRAFTS', unread: null },
      ],
    });
  });
  it('rejects stale UIDVALIDITY before reading or changing a message', async () => {
    const f = fixture();
    await expect(
      f.service.update(actor, { ...scope, uidValidity: '122', seen: true }),
    ).rejects.toThrow('MAIL_UID_VALIDITY_CHANGED');
    expect(f.client.fetchOne).not.toHaveBeenCalled();
    expect(f.client.messageFlagsAdd).not.toHaveBeenCalled();
    expect(f.release).toHaveBeenCalled();
  });
  it('checks revocation after waiting for a mailbox lock', async () => {
    const f = fixture();
    f.client.getMailboxLock.mockImplementation(async () => {
      f.access.assertAllowed.mockRejectedValue(new Error('REVOKED') as never);
      return { release: f.release };
    });
    await expect(
      f.service.update(actor, { ...scope, seen: true }),
    ).rejects.toThrow('REVOKED');
    expect(f.client.messageFlagsAdd).not.toHaveBeenCalled();
    expect(f.release).toHaveBeenCalled();
  });
  it('returns sanitized HTML and hides Bcc from another administrator', async () => {
    const f = fixture();
    f.account.userWorkspaceId = 'other-owner';
    const result = await f.service.message(actor, scope);
    expect(result).not.toHaveProperty('bcc');
    expect(result.html.trim()).toBe('<p>Hello</p>');
    expect(result.remoteImagesBlocked).toBe(true);
  });
  it('saves a persistent draft only through native IMAP append', async () => {
    const f = fixture();
    const result = await f.service.compose(
      actor,
      { ...scope, mode: 'REPLY', from: 'me@example.com', text: 'Answer' },
      true,
    );
    expect(result).toMatchObject({
      state: 'SAVED',
      folder: 'Drafts',
      uid: 50,
      uidValidity: '456',
    });
    expect(f.client.append).toHaveBeenCalledWith('Drafts', expect.any(Buffer), [
      '\\Draft',
    ]);
    expect(f.imap.closeClient).toHaveBeenCalledWith(f.client);
  });
  it('does not silently save a draft with missing attachments', async () => {
    const f = fixture();
    await expect(
      f.service.compose(
        actor,
        {
          ...scope,
          mode: 'REPLY',
          from: 'me@example.com',
          text: 'Answer',
          attachmentIds: ['asset'],
        },
        true,
      ),
    ).rejects.toThrow('MEDIA_SCOPE_INVALID');
    expect(f.client.append).not.toHaveBeenCalled();
  });
  it('binds pagination cursor to folder and UIDVALIDITY', async () => {
    const f = fixture();
    const cursor = Buffer.from(
      JSON.stringify({ folder: 'Elsewhere', validity: '123', before: 20 }),
    ).toString('base64url');
    await expect(
      f.service.page(actor, { folder: 'INBOX', cursor }),
    ).rejects.toThrow('MAIL_CURSOR_EXPIRED');
    expect(f.client.fetchAll).not.toHaveBeenCalled();
  });
  it('refuses moving to a nonexistent destination', async () => {
    const f = fixture();
    await expect(
      f.service.update(actor, { ...scope, destination: 'missing', seen: true }),
    ).rejects.toThrow('MAIL_DESTINATION_NOT_FOUND');
    expect(f.client.messageMove).not.toHaveBeenCalled();
    expect(f.client.messageFlagsAdd).not.toHaveBeenCalled();
  });
  it('can move a large email without fetching or parsing its MIME body', async () => {
    const f = fixture();
    f.client.fetchOne.mockResolvedValue({
      uid: 12,
      size: 100 * 1024 * 1024,
    } as never);
    expect(
      await f.service.update(actor, { ...scope, destination: 'Drafts' }),
    ).toEqual({ state: 'UPDATED' });
    expect(f.client.fetchOne).toHaveBeenCalledWith(
      '12',
      { uid: true },
      { uid: true },
    );
    expect(f.client.messageMove).toHaveBeenCalledWith('12', 'Drafts', {
      uid: true,
    });
  });
  it('aborts writes resumed after the timeout has closed the session', async () => {
    jest.useFakeTimers();
    const f = fixture();
    let resume: () => void = () => {};
    f.client.fetchOne.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      return { uid: 12, size: 100 } as never;
    });
    const result = f.service.update(actor, { ...scope, seen: true });
    const assertion = expect(result).rejects.toThrow('MAIL_TIMEOUT');
    await jest.advanceTimersByTimeAsync(45001);
    await assertion;
    resume();
    await jest.runAllTimersAsync();
    expect(f.client.messageFlagsAdd).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

it('creates a Bcc-only mail with an own mailbox canonical contact and no hidden recipient in draft conversation arguments', async () => {
  const f = fixture();
  await f.service.sendNew(actor, {
    from: 'me@example.com',
    to: [],
    bcc: ['hidden@example.org'],
    subject: 'Private',
    text: 'Hello',
    clientRequestId: 'e4d16125-1299-4b15-aa57-d193a423b4e6',
  });
  expect(f.mail.draftConversation).toHaveBeenCalledWith(
    actor,
    expect.objectContaining({ contactHandle: 'me@example.com' }),
    expect.any(Function),
    false,
    'e4d16125-1299-4b15-aa57-d193a423b4e6',
  );
  expect(JSON.stringify(f.mail.draftConversation.mock.calls)).not.toContain(
    'hidden@example.org',
  );
  expect(f.mail.replyRich).toHaveBeenCalledWith(
    actor,
    expect.objectContaining({
      envelope: expect.objectContaining({
        to: [],
        bcc: ['hidden@example.org'],
      }),
    }),
  );
});

it('persists an empty native draft, replays it, replaces edited content recoverably, and keeps attachment scope and send request separate', async () => {
  const f = fixture();
  const draftId = 'e4d16125-1299-4b15-aa57-d193a423b4e6';
  const canonical = messagingId(
    actor.workspaceId,
    'EMAIL',
    'mail',
    `draft:${draftId}`,
  );
  f.mail.draftConversation.mockResolvedValue({ id: canonical });
  let nextUid = 50;
  let selectedFolder = 'Drafts';
  const native = new Map<number, { folder: string; raw: Buffer }>();
  f.client.list.mockImplementation(async () =>
    ['INBOX', 'Drafts', 'Trash'].map((path) => ({
      path,
      name: path,
      flags: new Set<string>(),
      specialUse:
        path === 'Drafts' ? '\\Drafts' : path === 'Trash' ? '\\Trash' : '',
    })),
  );
  f.imap.getClient.mockImplementation(async () => ({ ...f.client }) as never);
  f.client.getMailboxLock.mockImplementation(async (path?: string) => {
    selectedFolder = path ?? 'Drafts';
    return { release: f.release };
  });
  f.client.search.mockImplementation(async () =>
    [...native.entries()]
      .filter(([, value]) => value.folder === selectedFolder)
      .map(([uid]) => uid),
  );
  f.client.fetchOne.mockImplementation(async (value, query) => {
    const uid = Number(value);
    const row = native.get(uid);
    return row
      ? ({
          uid,
          size: row.raw.length,
          ...(query.source ? { source: row.raw } : {}),
        } as never)
      : (false as never);
  });
  f.client.append.mockImplementation(async (path?: string, raw?: Buffer) => {
    const uid = ++nextUid;
    native.set(uid, { folder: path!, raw: raw! });
    return { uid, uidValidity: 123n };
  });
  f.client.messageMove.mockImplementation(
    async (uids?: string, target?: string) => {
      for (const id of uids!.split(','))
        native.get(Number(id))!.folder = target!;
      return { uidMap: new Map() };
    },
  );
  const empty = {
    draftId,
    from: 'me@example.com',
    subject: '',
    text: '',
    to: [],
  };
  const first = await f.service.createDraft(actor, empty);
  expect(first).toMatchObject({
    state: 'SAVED',
    draftId,
    conversationId: canonical,
    uidValidity: '123',
  });
  const replay = await f.service.createDraft(actor, empty);
  expect(replay).toMatchObject({
    replay: true,
    uid: first.uid,
    draftRevision: first.draftRevision,
  });
  expect(f.client.append).toHaveBeenCalledTimes(1);
  f.client.capabilities.clear();
  f.mail.draftConversation.mockClear();
  await expect(
    f.service.createDraft(actor, {
      ...empty,
      to: ['new@example.org'],
      subject: 'Edited',
      text: 'Hello',
      draftRevision: first.draftRevision,
    }),
  ).rejects.toThrow('MAIL_SAFE_MOVE_UNAVAILABLE');
  expect(f.client.append).toHaveBeenCalledTimes(1);
  expect(f.mail.draftConversation).not.toHaveBeenCalled();
  expect(f.client.messageMove).not.toHaveBeenCalled();
  f.client.capabilities.set('MOVE', true);
  const edited = {
    ...empty,
    to: ['new@example.org'],
    subject: 'Edited',
    text: 'Hello',
    draftRevision: first.draftRevision,
  };
  const second = await f.service.createDraft(actor, edited);
  expect(second).toMatchObject({ state: 'SAVED', conversationId: canonical });
  expect(second.uid).not.toBe(first.uid);
  expect(native.get(Number(first.uid))?.folder).toBe('Trash');
  await expect(f.service.createDraft(actor, edited)).rejects.toThrow(
    'MAIL_DRAFT_REVISION_CONFLICT',
  );
  f.mail.draftAttachments.mockResolvedValue([
    {
      filename: 'fixture.pdf',
      contentType: 'application/pdf',
      content: Buffer.from('%PDF-1.7'),
    },
  ] as never);
  const third = await f.service.createDraft(actor, {
    ...edited,
    draftRevision: second.draftRevision,
    attachmentIds: ['e4d16125-1299-4b15-aa57-d193a423b4e8'],
  });
  const parsed = await PostalMime.parse(native.get(Number(third.uid))!.raw);
  expect(parsed.to?.[0].address).toBe('new@example.org');
  expect(parsed.attachments).toHaveLength(1);
  expect(f.mail.draftAttachments).toHaveBeenLastCalledWith(actor, canonical, [
    'e4d16125-1299-4b15-aa57-d193a423b4e8',
  ]);
  expect(f.mail.replyRich).not.toHaveBeenCalled();
  expect(f.mail.draftConversation).toHaveBeenCalledWith(
    actor,
    expect.objectContaining({
      clientRequestId: draftId,
      contactHandle: 'new@example.org',
    }),
    expect.any(Function),
    true,
  );
  Object.assign(f.account, { handleAliases: ['alias@example.net'] });
  const fourth = await f.service.createDraft(actor, {
    ...edited,
    from: 'alias@example.net',
    draftRevision: third.draftRevision,
    attachmentIds: ['e4d16125-1299-4b15-aa57-d193a423b4e8'],
  });
  expect(fourth.conversationId).toBe(canonical);
  expect(native.get(Number(third.uid))?.folder).toBe('Trash');
  expect(
    (await PostalMime.parse(native.get(Number(fourth.uid))!.raw)).from?.address,
  ).toBe('alias@example.net');
  const sendRequestId = 'e4d16125-1299-4b15-aa57-d193a423b4e9';
  await f.service.sendNew(actor, {
    ...edited,
    from: 'alias@example.net',
    draftRevision: fourth.draftRevision,
    clientRequestId: sendRequestId,
  });
  expect(f.mail.replyRich).toHaveBeenCalledWith(
    actor,
    expect.objectContaining({
      conversationId: canonical,
      clientRequestId: sendRequestId,
    }),
  );
});

it.each([true, false])(
  'keeps SMTP ACCEPTED after lost Sent APPEND ACK and reload, with no blind reappend (stored=%s)',
  async (storedBeforeDisconnect) => {
    const f = fixture();
    const native = new Map<number, Buffer>();
    let state: string | null = null,
      smtpAttempts = 0;
    const requests = new Set<string>();
    f.mail.replyRich.mockImplementation(
      async (_actor?: unknown, value?: { clientRequestId: string }) => {
        if (!requests.has(value!.clientRequestId)) {
          requests.add(value!.clientRequestId);
          smtpAttempts++;
        }
        return {
          id: 'reserved',
          conversationId: 'canonical',
          status: 'ACCEPTED',
        } as never;
      },
    );
    Object.assign(f.mail, {
      recordSentCopy: jest.fn(
        async (_actor: unknown, value: { action: string }) => {
          if (value.action === 'RESERVE') {
            if (state) return { appendAllowed: false };
            state = 'PENDING';
            return { appendAllowed: true };
          }
          state = value.action;
          return { appendAllowed: false };
        },
      ),
    });
    f.client.list.mockImplementation(async () => [
      {
        path: 'Sent',
        name: 'Sent',
        flags: new Set<string>(),
        specialUse: '\\Sent',
      },
    ]);
    f.client.search.mockImplementation(async () => [...native.keys()]);
    f.client.fetchOne.mockImplementation(async (value, query) => {
      const uid = Number(value);
      const raw = native.get(uid);
      return raw
        ? ({
            uid,
            size: raw.length,
            ...(query.source ? { source: raw } : {}),
          } as never)
        : (false as never);
    });
    f.client.append.mockImplementation(async (_path?: string, raw?: Buffer) => {
      expect(state).toBe('PENDING');
      if (storedBeforeDisconnect) native.set(50, raw!);
      throw new Error('ACK_LOST');
    });
    f.imap.getClient.mockImplementation(async () => ({ ...f.client }) as never);
    const input = {
      from: 'me@example.com',
      to: ['client@example.org'],
      subject: 'Accepted',
      text: 'Hello',
      clientRequestId: 'e4d16125-1299-4b15-aa57-d193a423b4e9',
    };
    expect(await f.service.sendNew(actor, input)).toMatchObject({
      status: 'ACCEPTED',
      sentCopy: { state: 'UNCONFIRMED' },
    });
    const reloaded = new HermesMailboxService(
      f.mail as never,
      f.imap as never,
      f.access as never,
    );
    expect(await reloaded.sendNew(actor, input)).toMatchObject({
      status: 'ACCEPTED',
      sentCopy: { state: storedBeforeDisconnect ? 'SAVED' : 'UNCONFIRMED' },
    });
    expect(f.client.append).toHaveBeenCalledTimes(1);
    expect(smtpAttempts).toBe(1);
  },
);

it.each([false, true])(
  'reconciles provider auto-Sent MIME headers only with equivalent accepted envelope and attachments (different PDF=%s)',
  async (differentPdf) => {
    const f = fixture();
    const requestId = 'e4d16125-1299-4b15-aa57-d193a423b4e9';
    const bytes = Buffer.from('%PDF-1.7 correct');
    const raw = await new MailComposer({
      from: 'me@example.com',
      to: ['client@example.org'],
      subject: 'Accepted',
      text: 'Hello',
      messageId: '<' + requestId + '@example.com>',
      headers: {
        Received:
          'from fixture.invalid by fixture.invalid; Fri, 30 Oct 2026 12:00:00 +0000',
      },
      attachments: [
        {
          filename: 'fixture.pdf',
          contentType: 'application/pdf',
          content: differentPdf ? Buffer.from('%PDF-1.7 different') : bytes,
        },
      ],
    })
      .compile()
      .build();
    f.mail.replyRich.mockResolvedValue({
      id: 'reserved',
      conversationId: 'canonical',
      status: 'ACCEPTED',
    } as never);
    f.mail.draftAttachments.mockResolvedValue([
      {
        filename: 'fixture.pdf',
        contentType: 'application/pdf',
        content: bytes,
      },
    ] as never);
    const record = jest.fn(async () => ({ appendAllowed: true }));
    Object.assign(f.mail, { recordSentCopy: record });
    f.client.list.mockResolvedValue([
      { path: 'Sent', name: 'Sent', flags: new Set(), specialUse: '\\Sent' },
    ]);
    f.client.search.mockResolvedValue([40]);
    let nativeUid = 40,
      nativeRaw = raw;
    f.client.fetchOne.mockImplementation(async (_value, query) => ({
      uid: nativeUid,
      size: nativeRaw.length,
      ...(query.source ? { source: nativeRaw } : {}),
    }));
    f.client.append.mockImplementation(
      async (_path?: string, value?: Buffer) => {
        nativeUid = 50;
        nativeRaw = value!;
        return { uid: 50, uidValidity: 123n };
      },
    );
    f.imap.getClient.mockImplementation(async () => ({ ...f.client }) as never);
    expect(
      await f.service.sendNew(actor, {
        from: 'me@example.com',
        to: ['client@example.org'],
        bcc: ['hidden@example.org'],
        subject: 'Accepted',
        text: 'Hello',
        clientRequestId: requestId,
        attachmentIds: ['e4d16125-1299-4b15-aa57-d193a423b4e8'],
      }),
    ).toMatchObject({
      status: 'ACCEPTED',
      sentCopy: { state: 'SAVED', replay: !differentPdf },
    });
    expect(f.client.append).toHaveBeenCalledTimes(differentPdf ? 1 : 0);
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      'hidden@example.org',
    );
  },
);

it('rejects a foreign draft canonical scope before any draft conversation or native write', async () => {
  const f = fixture();
  await expect(
    f.service.createDraft(actor, {
      draftId: 'e4d16125-1299-4b15-aa57-d193a423b4e6',
      conversationId: 'e4d16125-1299-4b15-aa57-d193a423b4e8',
      from: 'me@example.com',
      subject: '',
      text: '',
    }),
  ).rejects.toThrow('MAIL_CONVERSATION_MISMATCH');
  expect(f.mail.draftConversation).not.toHaveBeenCalled();
  expect(f.client.append).not.toHaveBeenCalled();
});

it.each([
  ['ACCEPTED', 'Hello', true],
  ['UNCONFIRMED', 'Hello', false],
  ['ACCEPTED', 'A newer unsent edit', false],
  ['ACCEPTED', 'Hello', false, false],
])(
  'disposes only the exact native draft after accepted send, never after uncertainty or newer edits (%s, %s)',
  async (status, nativeText, moveExpected, moveCapability = true) => {
    const f = fixture();
    if (!moveCapability) f.client.capabilities.clear();
    const draftId = 'e4d16125-1299-4b15-aa57-d193a423b4e6';
    const raw = await new MailComposer({
      from: 'me@example.com',
      to: ['client@example.org'],
      subject: 'Send',
      text: nativeText as string,
      messageId: `<hermes-draft-${draftId}@hermes.invalid>`,
    })
      .compile()
      .build();
    f.mail.replyRich.mockResolvedValue({
      id: 'receipt',
      conversationId: 'canonical',
      providerConnectionId: 'mail',
      status,
    } as never);
    f.client.list.mockResolvedValue(
      ['Drafts', 'Trash'].map((path) => ({
        path,
        name: path,
        flags: new Set(),
        specialUse: path === 'Drafts' ? '\\Drafts' : '\\Trash',
      })),
    );
    f.client.search.mockResolvedValue([50]);
    f.client.fetchOne.mockImplementation(async (_value, query) => ({
      uid: 50,
      size: raw.length,
      ...(query.source ? { source: raw } : {}),
    }));
    f.imap.getClient.mockImplementation(async () => ({ ...f.client }) as never);
    const result = await f.service.sendNew(actor, {
      draftId,
      clientRequestId: 'e4d16125-1299-4b15-aa57-d193a423b4e9',
      from: 'me@example.com',
      to: ['client@example.org'],
      subject: 'Send',
      text: 'Hello',
    });
    expect(result).toMatchObject({
      status,
      draftDisposition: {
        state: !moveCapability
          ? 'UNAVAILABLE'
          : moveExpected
            ? 'MOVED_TO_TRASH'
            : status === 'ACCEPTED'
              ? 'NOT_FOUND'
              : 'NOT_ACCEPTED',
      },
    });
    expect(f.client.messageMove).toHaveBeenCalledTimes(moveExpected ? 1 : 0);
    if (moveExpected)
      expect(f.client.messageMove).toHaveBeenCalledWith('50', 'Trash', {
        uid: true,
      });
    expect(f.client.append).not.toHaveBeenCalled();
  },
);

it('MAIL-005 refuses native move fallback before any flag change when UID MOVE is unavailable', async () => {
  const f = fixture();
  f.client.capabilities.clear();
  f.client.capabilities.set('UIDPLUS', true);
  await expect(
    f.service.update(actor, { ...scope, destination: 'Drafts', seen: true }),
  ).rejects.toThrow('MAIL_SAFE_MOVE_UNAVAILABLE');
  expect(f.client.messageMove).not.toHaveBeenCalled();
  expect(f.client.messageFlagsAdd).not.toHaveBeenCalled();
});

it('MAIL-005 keeps Seen updates available without MOVE and recognizes a natively enabled IMAP4rev2 session', async () => {
  const f = fixture();
  f.client.capabilities.clear();
  await expect(
    f.service.update(actor, { ...scope, seen: true }),
  ).resolves.toEqual({ state: 'UPDATED' });
  const rev2 = fixture();
  rev2.client.capabilities.clear();
  rev2.client.enabled.add('IMAP4REV2');
  await expect(
    rev2.service.update(actor, { ...scope, destination: 'Drafts' }),
  ).resolves.toEqual({ state: 'UPDATED' });
  expect(rev2.client.messageMove).toHaveBeenCalledTimes(1);
});

it('MAIL006 rechecks actor access when Sent-copy errors would otherwise return a stale accepted message after role revocation', async () => {
  const f = fixture();
  let connections = 0;
  const accepted = {
    id: 'accepted',
    conversationId: 'canonical',
    providerConnectionId: 'mail',
    status: 'ACCEPTED',
    text: 'Private outbound body',
  };
  f.mail.replyRich.mockResolvedValue(accepted as never);
  f.imap.getClient.mockImplementation(async () => {
    if (++connections === 2)
      f.access.assertAllowed.mockRejectedValue(new Error('REVOKED') as never);
    return { ...f.client } as never;
  });
  const sent = f.service.sendNew(actor, {
    from: 'me@example.com',
    to: ['client@example.org'],
    subject: 'Private',
    text: 'Private outbound body',
    clientRequestId: 'e4d16125-1299-4b15-aa57-d193a423b4e9',
  });
  // The revocation propagates instead of resolving to the accepted message:
  // no caller ever receives the private body once access is gone.
  await expect(sent).rejects.toThrow('REVOKED');
  await expect(sent).rejects.toBeInstanceOf(Error);
  // The acceptance stays acquired: nothing is re-sent and nothing is appended.
  expect(f.mail.replyRich).toHaveBeenCalledTimes(1);
  expect(f.client.append).not.toHaveBeenCalled();
});

const privateAccepted = {
  id: 'accepted',
  conversationId: 'canonical',
  providerConnectionId: 'mail',
  status: 'ACCEPTED',
  text: 'Private outbound body',
};
const newSend = {
  from: 'me@example.com',
  to: ['client@example.org'],
  subject: 'Private',
  text: 'Private outbound body',
  clientRequestId: 'e4d16125-1299-4b15-aa57-d193a423b4e9',
};
// A client that never opens leaves the session's own closing recheck out of
// the picture, so each boundary below answers for itself.
const revokeInsteadOfOpening = (f: ReturnType<typeof fixture>, nth: number) => {
  let connections = 0;
  f.imap.getClient.mockImplementation(async () => {
    if (++connections !== nth) return { ...f.client } as never;
    f.access.assertAllowed.mockRejectedValue(new Error('REVOKED') as never);
    throw new Error('MAIL_CONNECTION_LOST');
  });
};

it('MAIL006 rechecks actor access after the awaited session close so a revocation during it never returns the mailbox listing', async () => {
  const f = fixture();
  // The revocation lands while the session close is awaited, after the
  // in-session access check and the fresh read have already passed.
  f.imap.closeClient.mockImplementation(async () => {
    f.access.assertAllowed.mockRejectedValue(new Error('REVOKED') as never);
    return undefined;
  });
  await expect(f.service.folders(actor)).rejects.toThrow('REVOKED');
  expect(f.imap.closeClient).toHaveBeenCalledTimes(1);
});

it('MAIL006 rechecks actor access when the Sent copy of an accepted reply fails under a revocation', async () => {
  const f = fixture();
  f.mail.replyRich.mockResolvedValue(privateAccepted as never);
  // The reply path carries no draft lock, so the copy's own catch is all that
  // stands between the revocation and the already accepted private message.
  revokeInsteadOfOpening(f, 2);
  const sent = f.service.send(actor, {
    ...scope,
    mode: 'REPLY',
    from: 'me@example.com',
    text: 'Private outbound body',
    clientRequestId: 'e4d16125-1299-4b15-aa57-d193a423b4e9',
  } as never);
  await expect(sent).rejects.toThrow('REVOKED');
  // The acceptance stays acquired: no second SMTP attempt, no append.
  expect(f.mail.replyRich).toHaveBeenCalledTimes(1);
  expect(f.client.append).not.toHaveBeenCalled();
});

it('MAIL006 rechecks actor access when an accepted draft disposition would otherwise swallow a revocation into UNCONFIRMED', async () => {
  const f = fixture();
  // On the send path the draft-lock recheck is the outer net, so this
  // boundary is exercised on its own to prove its catch no longer swallows.
  const dispose = (
    f.service as unknown as {
      disposeAcceptedDraft: (
        actor: unknown,
        receipt: unknown,
        draftId: string,
        envelope: unknown,
        attachmentIds: string[],
      ) => Promise<unknown>;
    }
  ).disposeAcceptedDraft.bind(f.service);
  revokeInsteadOfOpening(f, 1);
  await expect(
    dispose(
      actor,
      {
        status: 'ACCEPTED',
        providerConnectionId: 'mail',
        conversationId: 'canonical',
      },
      'draft-1',
      {},
      [],
    ),
  ).rejects.toThrow('REVOKED');
  // The draft is left exactly where the provider left it.
  expect(f.client.messageMove).not.toHaveBeenCalled();
});

it('MAIL006 rechecks actor access after the awaited draft-lock release so a revocation during it never returns the accepted message', async () => {
  const f = fixture();
  f.mail.replyRich.mockResolvedValue(privateAccepted as never);
  // withDraftLock releases the draft lock on an await placed after the
  // callback returned: revoke exactly there, where no inner check can see it.
  f.mail.withDraftLock.mockImplementation(
    async (_actor: unknown, _draftId: string, run: () => Promise<unknown>) => {
      const result = await run();
      f.access.assertAllowed.mockRejectedValue(new Error('REVOKED') as never);
      return result;
    },
  );
  await expect(f.service.sendNew(actor, newSend)).rejects.toThrow('REVOKED');
  // The send was accepted once and is never replayed by the failed handover.
  expect(f.mail.replyRich).toHaveBeenCalledTimes(1);
  expect(f.client.append).not.toHaveBeenCalled();
});
