beforeEach(() => jest.useRealTimers());
jest.mock('src/engine/core-modules/hermes-media/hermes-media.service', () => ({
  HermesMediaService: class {},
}));
jest.mock(
  'src/engine/core-modules/hermes-messaging/hermes-messaging.service',
  () => ({ HermesMessagingService: class {} }),
);
jest.mock(
  'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider',
  () => ({ ImapClientProvider: class {} }),
);
jest.mock(
  'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider',
  () => ({ SmtpClientProvider: class {} }),
);
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';
import { HermesMailService } from 'src/engine/core-modules/hermes-mail/hermes-mail.service';

const workspaceId = 'b9c2e7ad-67ed-42be-b687-1a410e60b5ba';
const userId = 'a9c2e7ad-67ed-42be-b687-1a410e60b5ba';
const memberId = 'e4d16125-1299-4b15-aa57-d193a423b4e7';
const accountId = 'e4d16125-1299-4b15-aa57-d193a423b4e6';
const conversationId = 'e4d16125-1299-4b15-aa57-d193a423b4e8';
const actor = { workspaceId, userId, userWorkspaceId: memberId };
const input = {
  workspaceId,
  providerConnectionId: 'company-inbox',
  conversationId,
  contactHandle: 'client@example.com',
  clientRequestId: 'b9c2e7ad-67ed-42be-b687-1a410e60b5bb',
  text: 'Synthetic reply only',
};

function fixture(reader?: unknown) {
  let serialized = JSON.stringify({
    [workspaceId]: {
      connectionId: 'company-inbox',
      connectedAccountId: accountId,
      userWorkspaceId: memberId,
    },
  });
  const account = {
    id: accountId,
    workspaceId,
    userWorkspaceId: memberId,
    handle: 'inbox@example.com',
    provider: ConnectedAccountProvider.IMAP_SMTP_CALDAV,
    authFailedAt: null,
    connectionParameters: {
      IMAP: { connectionSecurity: 'SSL_TLS' },
      SMTP: { connectionSecurity: 'STARTTLS' },
    },
  };
  const accounts = { findOne: jest.fn(async () => account) };
  const members = {
    findOne: jest.fn(async () => ({ id: memberId, userId, workspaceId })),
  };
  const cursors = {
    findOneBy: jest.fn(async () => ({ uidValidity: '123', lastUid: '11' })),
    save: jest.fn(async (value: unknown) => value),
  };
  const conversations = {
    findOneBy: jest.fn(async () => ({
      id: conversationId,
      workspaceId,
      contactHandle: 'client@example.com',
      subject: 'Quote',
      providerConversationId: '<root@example.com>',
    })),
  };
  const messages = {
    findOne: jest.fn(async () => ({ providerMessageId: '<last@example.com>' })),
  };
  const access = { assertAllowed: jest.fn(async () => undefined) };
  const client = {
    mailbox: { uidValidity: 123n },
    search: jest.fn(async () => [11, 12]),
    getMailboxLock: jest.fn(async () => ({ release: jest.fn() })),
    fetchAll: jest.fn(async (_range: string, query: { source?: unknown }) =>
      query.source
        ? [
            {
              uid: 12,
              source: Buffer.from(
                'From: client@example.com\r\nMessage-ID: <mail@example.com>\r\n\r\nHello',
              ),
            },
          ]
        : [
            {
              uid: 12,
              size: 500,
              envelope: { from: [{ address: 'client@example.com' }] },
            },
          ],
    ),
  };
  Object.assign(client, {
    fetchOne: jest.fn(
      async (range: string, query: { source?: unknown }) =>
        (await client.fetchAll(range, query))[0] ?? false,
    ),
  });
  const imap = {
    getClient: jest.fn(async () => client),
    closeClient: jest.fn(async () => undefined),
  };
  const transport = {
    sendMail: jest.fn(async (_value: unknown) => ({
      accepted: ['client@example.com'],
      messageId: '<accepted@example.com>',
    })),
    close: jest.fn(),
  };
  const smtp = { getClient: jest.fn(async () => transport) };
  const inbox = {
    ingest: jest.fn(async (_event: unknown) => ({
      conversationId,
      messageId: 'fixture-message',
      replay: false,
    })),
  };
  const registry = { register: jest.fn() };
  const redisClient = {
    set: jest.fn(async () => 'OK'),
    eval: jest.fn(async () => 1),
  };
  const redis = { getClient: jest.fn(() => redisClient) };
  const config = {
    get: (key: string) =>
      key === 'HERMES_MAIL_CONNECTIONS' ? serialized : 'fixture-prefix',
  };
  const service = new HermesMailService(
    config as never,
    accounts as never,
    members as never,
    cursors as never,
    conversations as never,
    messages as never,
    access as never,
    imap as never,
    smtp as never,
    inbox as never,
    registry as never,
    redis as never,
    undefined,
    reader as never,
  );
  return {
    service,
    account,
    accounts,
    cursors,
    access,
    client,
    imap,
    smtp,
    transport,
    inbox,
    redisClient,
    setConfig: (value: string) => {
      serialized = value;
    },
  };
}

describe('Hermes mailbox bridge', () => {
  it('never claims a missing configuration or opens a connection', async () => {
    const f = fixture();
    f.setConfig('{}');
    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'NOT_CONFIGURED',
      canSend: false,
      canSync: false,
    });
    expect(f.accounts.findOne).not.toHaveBeenCalled();
    expect(f.imap.getClient).not.toHaveBeenCalled();
  });
  it('reports credentials as unverified rather than connected', async () => {
    const f = fixture();
    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'CONFIGURED_UNVERIFIED',
      canSend: true,
      canSync: true,
    });
    expect(f.accounts.findOne.mock.calls[0][0]).toMatchObject({
      where: { id: accountId, workspaceId, userWorkspaceId: memberId },
    });
    expect(f.imap.getClient).not.toHaveBeenCalled();
  });
  it('stops immediately when the delegating operator was revoked', async () => {
    const f = fixture();
    f.access.assertAllowed.mockRejectedValue(new Error('revoked'));
    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'UNAVAILABLE',
    });
    await expect(f.service.sync(actor)).rejects.toThrow('revoked');
    expect(f.imap.getClient).not.toHaveBeenCalled();
  });
  it('rejects plaintext before creating the native client', async () => {
    const f = fixture();
    f.account.connectionParameters.IMAP.connectionSecurity = 'NONE';
    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'UNAVAILABLE',
      canSync: false,
    });
    expect(f.imap.getClient).not.toHaveBeenCalled();
  });
  it('uses read-only IMAP and does not replay the range endpoint behind the durable cursor', async () => {
    const f = fixture();
    expect(await f.service.sync(actor)).toMatchObject({
      state: 'SYNCED',
      received: 1,
      replayed: 0,
    });
    expect(f.client.getMailboxLock).toHaveBeenCalledWith(
      'INBOX',
      expect.objectContaining({ readOnly: true }),
    );
    expect(f.client.search).toHaveBeenCalledWith(
      { uid: '12:*' },
      { uid: true },
    );
    expect(f.client.fetchAll.mock.calls[0][0]).toBe('12');
    expect(f.inbox.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        channel: 'EMAIL',
        providerMessageId: 'imap:INBOX:123:12',
      }),
      { suppressAutomation: false, observedOnly: false },
    );
    expect(f.cursors.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        lastUid: '12',
        uidValidity: '123',
      }),
    );
    expect(f.imap.closeClient).toHaveBeenCalled();
  });
  it('does not advance the cursor when durable inbox storage failed', async () => {
    const f = fixture();
    f.inbox.ingest.mockRejectedValue(new Error('database unavailable'));
    await expect(f.service.sync(actor)).rejects.toThrow('database unavailable');
    expect(
      f.cursors.save.mock.calls.every(
        ([value]) => Number((value as { lastUid: string }).lastUid) <= 11,
      ),
    ).toBe(true);
    expect(f.imap.closeClient).toHaveBeenCalled();
    expect(f.redisClient.eval).toHaveBeenCalled();
  });
  it('preserves reply headers and waits for actual SMTP acceptance', async () => {
    const f = fixture();
    expect(await f.service.send(input)).toMatchObject({
      providerMessageId: '<accepted@example.com>',
    });
    expect(f.transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'inbox@example.com',
        to: 'client@example.com',
        inReplyTo: '<last@example.com>',
        references: ['<root@example.com>', '<last@example.com>'],
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
    );
    expect(f.transport.close).toHaveBeenCalledTimes(1);
  });
  it('refuses replying to the delegated mailbox itself before opening SMTP', async () => {
    const f = fixture();
    await expect(
      f.service.send({ ...input, contactHandle: 'inbox@example.com' }),
    ).rejects.toThrow('INVALID_RECIPIENT');
    expect(f.smtp.getClient).not.toHaveBeenCalled();
    expect(f.transport.sendMail).not.toHaveBeenCalled();
  });
  it('expires a stalled SMTP acknowledgement without retrying or claiming acceptance', async () => {
    jest.useFakeTimers();
    const f = fixture();
    f.transport.sendMail.mockImplementation(() => new Promise(() => {}));
    const sent = f.service.send(input);
    const observed = expect(sent).rejects.toThrow('SEND_OUTCOME_UNCONFIRMED');
    await jest.advanceTimersByTimeAsync(30001);
    await observed;
    expect(f.transport.sendMail).toHaveBeenCalledTimes(1);
    expect(f.transport.close).toHaveBeenCalled();
    jest.useRealTimers();
  });
  it('never upgrades a missing acknowledgement to acceptance and never retries', async () => {
    const f = fixture();
    f.transport.sendMail.mockRejectedValue(new Error('DATA ack lost'));
    await expect(f.service.send(input)).rejects.toThrow(
      'SEND_OUTCOME_UNCONFIRMED',
    );
    expect(f.transport.sendMail).toHaveBeenCalledTimes(1);
    expect(f.transport.close).toHaveBeenCalledTimes(1);
  });
});

describe('rich mailbox adapter boundary', () => {
  const email = {
    from: 'inbox@example.com',
    to: ['client@example.com'],
    cc: [],
    bcc: [],
    subject: 'Re: Quote',
    text: 'Synthetic reply only',
    references: [],
  };
  it('uses exact SMTP envelope and private attachment bytes while sanitizing HTML', async () => {
    const f = fixture();
    await f.service.send({
      ...input,
      email: {
        ...email,
        html: '<p>Hi</p><img src="https://tracker.invalid/x"><script>x()</script>',
      },
      attachments: [
        {
          assetId: 'asset',
          kind: 'FILE',
          mimeType: 'application/pdf',
          filename: 'document.pdf',
          bytes: Buffer.from('%PDF-1.7'),
        },
      ],
    });
    expect(f.transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'inbox@example.com',
        envelope: { from: 'inbox@example.com', to: ['client@example.com'] },
        html: '<p>Hi</p>',
        attachments: [
          expect.objectContaining({
            filename: 'document.pdf',
            content: Buffer.from('%PDF-1.7'),
          }),
        ],
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
    );
  });
  it('never treats partial multi-recipient SMTP acceptance as completed emission', async () => {
    const f = fixture();
    await expect(
      f.service.send({
        ...input,
        email: { ...email, cc: ['other@example.com'] },
      }),
    ).rejects.toThrow('SEND_OUTCOME_UNCONFIRMED');
    expect(f.transport.sendMail).toHaveBeenCalledTimes(1);
    expect(f.transport.close).toHaveBeenCalled();
  });
  it('rejects another sender on the mailbox domain before opening SMTP', async () => {
    const f = fixture();
    await expect(
      f.service.send({
        ...input,
        email: { ...email, from: 'admin@example.com' },
      }),
    ).rejects.toThrow();
    expect(f.smtp.getClient).not.toHaveBeenCalled();
  });
  it('imports observed Sent MIME without fabrication of acceptance or automatic reply', async () => {
    const f = fixture();
    await f.service.observe(
      actor,
      { folder: 'Sent', uid: '12', uidValidity: '123' },
      {
        headers: [],
        headerLines: [],
        attachments: [],
        from: { name: '', address: 'inbox@example.com' },
        to: [{ name: '', address: 'client@example.com' }],
        messageId: '<observed@example.com>',
        subject: 'Test',
        text: 'Observed',
      },
    );
    expect(f.inbox.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        contactHandle: 'client@example.com',
        kind: 'EMAIL',
      }),
      { suppressAutomation: true, observedOnly: true },
    );
    expect(f.transport.sendMail).not.toHaveBeenCalled();
  });
});

describe('authoritative encrypted-connection reader', () => {
  const record = {
    connectionId: 'central-mail',
    revision: '1',
    userId,
    userWorkspaceId: memberId,
    settings: {
      connectedAccountId: accountId,
      mailbox: 'INBOX',
      handle: 'inbox@example.com',
    },
    secrets: {},
  };
  it('does not resurrect a revoked central binding from legacy environment configuration', async () => {
    const reader = {
      resolve: jest.fn(async () => null),
      workspaceIds: jest.fn(async () => []),
    };
    const f = fixture(reader);
    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'NOT_CONFIGURED',
      canSend: false,
    });
    expect(f.accounts.findOne).not.toHaveBeenCalled();
    expect(f.imap.getClient).not.toHaveBeenCalled();
  });
  it('does not fall back to legacy environment bindings when the reader fails', async () => {
    const f = fixture({
      resolve: async () => {
        throw new Error('REVOKED');
      },
    });
    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'UNAVAILABLE',
      canSend: false,
    });
    expect(f.accounts.findOne).not.toHaveBeenCalled();
  });
  it('uses the native encrypted account selected by the central reader', async () => {
    const reader = { resolve: jest.fn(async () => record) };
    const f = fixture(reader);
    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'CONFIGURED_UNVERIFIED',
      canSend: true,
    });
    expect(reader.resolve).toHaveBeenCalledWith(workspaceId, 'MAIL');
    expect(f.accounts.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: accountId,
          userWorkspaceId: memberId,
          workspaceId,
        }),
      }),
    );
  });
  it('rejects an identity changed between the central binding and native account', async () => {
    const f = fixture({
      resolve: async () => ({
        ...record,
        settings: { ...record.settings, handle: 'other@example.com' },
      }),
    });
    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'UNAVAILABLE',
      canSend: false,
    });
  });
  it('rechecks the central revision after opening SMTP and emits nothing after a change', async () => {
    let revision = '1';
    const f = fixture({ resolve: async () => ({ ...record, revision }) });
    f.smtp.getClient.mockImplementation(async () => {
      revision = '2';
      return f.transport;
    });
    await expect(
      f.service.send({
        ...input,
        providerConnectionId: 'central-mail',
        email: {
          from: 'inbox@example.com',
          to: ['client@example.com'],
          cc: [],
          bcc: [],
          subject: 'Test',
          text: 'Synthetic',
          references: [],
        },
      }),
    ).rejects.toThrow('SEND_OUTCOME_UNCONFIRMED');
    expect(f.transport.sendMail).not.toHaveBeenCalled();
  });
});
