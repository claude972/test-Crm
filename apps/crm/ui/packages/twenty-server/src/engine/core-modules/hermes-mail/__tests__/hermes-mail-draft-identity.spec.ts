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

import { ForbiddenException } from '@nestjs/common';

import { HermesMailboxService } from 'src/engine/core-modules/hermes-mail/hermes-mailbox.service';

// The mail draft-identity contract: hermesMailMessageV4 publishes the stable
// identity of a Hermes draft so a resume is driven by the server instead of a
// browser-local store. It is published only for a real Hermes stable draft, so
// nothing has to be fabricated client-side. Isolated fixtures: no IMAP server,
// no mailbox and no network.
const actor = {
  workspaceId: 'f2c96b7b-f314-4561-9b5c-0011cfe03fd0',
  userId: 'eb92012d-703f-44b8-b968-10477e5cc020',
  userWorkspaceId: 'ff2293ce-ac4b-4717-a914-43492ccc0b02',
};
const draftId = '7b5d2c41-9f0a-4a3e-8c21-6d5e4f3a2b10';
const mime = (headers: string) =>
  Buffer.from(
    `${headers}\r\nSubject: Brouillon en cours\r\nContent-Type: text/plain\r\n\r\nTexte du brouillon`,
  );
const hermesDraft = mime(
  `From: me@example.com\r\nTo: client@example.org\r\nMessage-ID: <hermes-draft-${draftId}@hermes.invalid>`,
);

function fixture(raw: Buffer) {
  const account = {
    id: 'mail-account',
    handle: 'me@example.com',
    userWorkspaceId: actor.userWorkspaceId,
  };
  const item = { account, binding: { connectionId: 'mail' } };
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
    ]),
    status: jest.fn(async () => ({ messages: 1 })),
    search: jest.fn(async () => [12]),
    fetchAll: jest.fn(async () => []),
    fetchOne: jest.fn(async (_uid: string, query: { source?: unknown }) =>
      query.source ? { uid: 12, source: raw } : { uid: 12, size: raw.length },
    ),
    messageFlagsAdd: jest.fn(async () => true),
    messageFlagsRemove: jest.fn(async () => true),
    append: jest.fn(async () => ({ uid: 50, uidValidity: 456n })),
    close: jest.fn(),
  };
  const access = { assertAllowed: jest.fn(async () => undefined) };
  const mail = {
    connection: jest.fn(async () => item),
    observe: jest.fn(async () => ({
      conversationId: 'canonical',
      messageId: 'message',
      providerConnectionId: 'mail',
      direction: 'OUTBOUND',
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
  return { service, mail, imap, client, access };
}

const read = (f: ReturnType<typeof fixture>, folder: string) =>
  f.service.message(actor, { folder, uid: '12', uidValidity: '123' });

describe('Mail draft identity published by hermesMailMessageV4', () => {
  it('publishes the stable identity of a Hermes draft sitting in the Drafts folder', async () => {
    const f = fixture(hermesDraft);

    const result = (await read(f, 'Drafts')) as Record<string, unknown>;

    expect(result.draftId).toBe(draftId);
    // The revision is the parsed-content signature the save path compares, so
    // handing it back yields MAIL_DRAFT_REVISION_CONFLICT rather than an
    // overwrite of a newer draft.
    expect(result.draftRevision).toMatch(/^[a-f0-9]{64}$/);
    // The rest of the existing read is untouched.
    expect(result.conversationId).toBe('canonical');
    expect(result.folder).toBe('Drafts');
    expect(result.uid).toBe('12');
  });

  it('publishes nothing for an ordinary message and spends no extra round trip', async () => {
    const f = fixture(
      mime(
        'From: sender@example.org\r\nTo: me@example.com\r\nMessage-ID: <source@example.org>',
      ),
    );

    const result = (await read(f, 'INBOX')) as Record<string, unknown>;

    expect(result).not.toHaveProperty('draftId');
    expect(result).not.toHaveProperty('draftRevision');
    // The two free checks reject first, so the only folder listing is the one
    // the folder lock already performs: no extra round trip is spent on a
    // message that cannot be a Hermes draft.
    expect(f.client.list).toHaveBeenCalledTimes(1);
  });

  it('refuses a forged Hermes draft Message-ID from a foreign sender', async () => {
    const f = fixture(
      mime(
        `From: attacker@example.org\r\nTo: me@example.com\r\nMessage-ID: <hermes-draft-${draftId}@hermes.invalid>`,
      ),
    );

    const result = (await read(f, 'Drafts')) as Record<string, unknown>;

    // Same identity rule as the save path: the sender must be a sendable
    // handle of this account, so another party cannot mint a draft identity.
    expect(result).not.toHaveProperty('draftId');
    expect(result).not.toHaveProperty('draftRevision');
    expect(f.client.list).toHaveBeenCalledTimes(1);
  });

  it('publishes nothing for a Hermes draft read outside the Drafts folder', async () => {
    const f = fixture(hermesDraft);

    const result = (await read(f, 'INBOX')) as Record<string, unknown>;

    expect(result).not.toHaveProperty('draftId');
    expect(result).not.toHaveProperty('draftRevision');
    // A candidate draft does resolve the special-use Drafts path, which costs
    // one listing beyond the lock's; the folder did not match it, so no
    // identity is published.
    expect(f.client.list).toHaveBeenCalledTimes(2);
  });

  it('publishes nothing for a malformed draft identifier', async () => {
    const f = fixture(
      mime(
        'From: me@example.com\r\nTo: client@example.org\r\nMessage-ID: <hermes-draft-not-a-uuid-at-all-xxxxxx@hermes.invalid>',
      ),
    );

    const result = (await read(f, 'Drafts')) as Record<string, unknown>;

    expect(result).not.toHaveProperty('draftId');
  });

  it('rechecks the actor access behind the folder listing before publishing an identity', async () => {
    const f = fixture(hermesDraft);
    // Revoked while the listing round trip was in flight: the identity must
    // not be delivered. This keeps the MAIL006 discipline on the new path.
    f.access.assertAllowed.mockImplementation(async () => {
      if (f.client.list.mock.calls.length > 1) throw new ForbiddenException();
    });

    await expect(read(f, 'Drafts')).rejects.toThrow(ForbiddenException);
  });
});
