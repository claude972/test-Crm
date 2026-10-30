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
