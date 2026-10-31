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
jest.mock(
  'src/engine/core-modules/hermes-messaging/hermes-messaging-person.service',
  () => ({ HermesMessagingPersonService: class {} }),
);
import { HermesMailboxService } from 'src/engine/core-modules/hermes-mail/hermes-mailbox.service';
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

function fixture(reader?: unknown, media?: unknown) {
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
    findOne: jest.fn(async (_options?: unknown) => ({
      providerMessageId: '<last@example.com>',
    })),
  };
  const access = {
    assertAllowed: jest.fn(
      async (_actor?: unknown, _manager?: unknown) => undefined,
    ),
  };
  const client = {
    capabilities: new Map([['MOVE', true]]),
    enabled: new Set<string>(),
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
              size: Buffer.byteLength(
                'From: client@example.com\r\nMessage-ID: <mail@example.com>\r\n\r\nHello',
              ),
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
    ensureEmailDraftConversation: jest.fn(async () => ({ id: conversationId })),
    ingest: jest.fn(async (_event: unknown, _options?: unknown) => ({
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
    media as never,
    reader as never,
  );
  return {
    service,
    account,
    accounts,
    messages,
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
  it('does not turn a fresh sync cursor into a reachable mailbox', async () => {
    // The cursor is the trace of a past poll. Credentials can be revoked and a
    // server can go down a second after a successful sync, so freshness is not
    // reachability — this used to publish AVAILABLE and showed a mailbox as
    // reached that nobody had reached.
    const f = fixture();

    f.cursors.findOneBy.mockResolvedValue({
      uidValidity: '123',
      lastUid: '11',
      updatedAt: new Date(),
    } as never);

    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'CONFIGURED_UNVERIFIED',
    });

    // And nothing was dialled to reach that verdict: this runs on the
    // connections listing and on every AUTO activation.
    expect(f.imap.getClient).not.toHaveBeenCalled();
    expect(f.smtp.getClient).not.toHaveBeenCalled();
  });
  it('keeps rich composition a configuration permission, not a past sync', async () => {
    // Previously gated on cursor freshness, which is reception evidence and
    // says nothing about SMTP. It is the same permission as sending.
    const f = fixture();

    f.cursors.findOneBy.mockResolvedValue(null as never);

    expect(await f.service.probe(workspaceId)).toMatchObject({
      status: 'CONFIGURED_UNVERIFIED',
      canSend: true,
      canComposeRichEmail: true,
    });
  });
  it('refuses rich composition when SMTP is not secure', async () => {
    const f = fixture();

    f.account.connectionParameters.SMTP.connectionSecurity = 'NONE';

    expect(await f.service.probe(workspaceId)).toMatchObject({
      canSend: false,
      canComposeRichEmail: false,
    });
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
      expect.objectContaining({
        suppressAutomation: false,
        observedOnly: false,
        assertLive: expect.any(Function),
      }),
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
      expect.objectContaining({
        suppressAutomation: true,
        observedOnly: true,
        assertLive: expect.any(Function),
      }),
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
    expect(reader.resolve).toHaveBeenCalledWith(workspaceId, 'MAIL', undefined);
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

describe('HERMES-V4-MAIL-001 observation write boundary', () => {
  it.each(['revoked', 'expired'] as const)(
    'never ingests a message after %s while private media retrieval was awaiting',
    async (mode) => {
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
      let revoked = false,
        expired = false;
      let start: () => void = () => {},
        release: () => void = () => {};
      const started = new Promise<void>((resolve) => {
        start = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const media = {
        receive: jest.fn(async () => {
          start();
          await gate;
          return { assetId: '54f909f6-0591-48ca-b4ad-7c89a77ea339' };
        }),
      };
      const f = fixture(
        { resolve: async () => (revoked ? null : record) },
        media,
      );
      const pending = f.service.observe(
        actor,
        { folder: 'INBOX', uid: '12', uidValidity: '123' },
        {
          headers: [],
          headerLines: [],
          attachments: [
            {
              filename: 'fixture.pdf',
              mimeType: 'application/pdf',
              disposition: 'attachment',
              content: Buffer.from('%PDF-1.7'),
            },
          ],
          from: { name: '', address: 'client@example.com' },
          to: [{ name: '', address: 'inbox@example.com' }],
          messageId: '<guard@example.com>',
          text: 'Gate',
        },
        true,
        () => {
          if (expired) throw new Error('MAIL_TIMEOUT');
        },
      );
      await Promise.race([
        started,
        pending.then(() => {
          throw new Error('INGEST_COMPLETED_BEFORE_GATE');
        }),
      ]);
      if (mode === 'revoked') revoked = true;
      else expired = true;
      release();
      await expect(pending).rejects.toThrow(
        mode === 'revoked' ? 'MAIL_CONNECTION_CHANGED' : 'MAIL_TIMEOUT',
      );
      expect(f.inbox.ingest).not.toHaveBeenCalled();
    },
  );
});

it('propagates the ingress manager through the central reader, account and membership authorization without a second pool checkout', async () => {
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
  let inTransaction = false;
  let fixtureResult: ReturnType<typeof fixture>;
  const manager = {
    getRepository: jest.fn((target: { name: string }) => ({
      findOne: async () =>
        target.name === 'ConnectedAccountEntity'
          ? fixtureResult.account
          : { id: memberId, userId, workspaceId },
    })),
  };
  const reader = {
    resolve: jest.fn(
      async (_workspaceId: string, _kind: string, transaction?: unknown) => {
        if (inTransaction) expect(transaction).toBe(manager);
        return record;
      },
    ),
  };
  const media = {
    receive: jest.fn(
      async (
        _input: unknown,
        options: { assertLive: (manager?: unknown) => Promise<void> },
      ) => {
        inTransaction = true;
        try {
          await options.assertLive(manager);
          return { assetId: '54f909f6-0591-48ca-b4ad-7c89a77ea339' };
        } finally {
          inTransaction = false;
        }
      },
    ),
  };
  fixtureResult = fixture(reader, media);
  fixtureResult.accounts.findOne.mockImplementation(async () => {
    if (inTransaction) throw new Error('SECOND_POOL_CHECKOUT');
    return fixtureResult.account;
  });
  fixtureResult.access.assertAllowed.mockImplementation(
    async (_actor, _manager) => {
      if (inTransaction) expect(_manager).toBe(manager);
    },
  );
  await fixtureResult.service.observe(
    actor,
    { folder: 'INBOX', uid: '12', uidValidity: '123' },
    {
      headers: [],
      headerLines: [],
      attachments: [
        {
          filename: 'fixture.pdf',
          mimeType: 'application/pdf',
          disposition: 'attachment',
          content: Buffer.from('%PDF-1.7'),
        },
      ],
      from: { name: '', address: 'client@example.com' },
      to: [{ name: '', address: 'inbox@example.com' }],
      messageId: '<manager@example.com>',
      text: 'Bound',
    },
  );
  expect(manager.getRepository).toHaveBeenCalled();
  expect(reader.resolve).toHaveBeenCalledWith(workspaceId, 'MAIL', manager);
  expect(fixtureResult.inbox.ingest).toHaveBeenCalledWith(
    expect.any(Object),
    expect.objectContaining({ assertLive: expect.any(Function) }),
  );
});

describe('HERMES-V4-MAIL-002 full MIME provenance', () => {
  it('keeps two physical deliveries with the same RFC id/text/participants and different attachment bytes', async () => {
    let uid = 12,
      bodyUid = 12,
      part = 0;
    const media = {
      receive: jest.fn(async () => ({
        assetId: '54f909f6-0591-48ca-b4ad-7c89a77ea33' + String(++part),
      })),
    };
    const f = fixture(undefined, media);
    type Stored = {
      workspaceId: string;
      channel: string;
      providerConnectionId: string;
      providerMessageId: string;
      direction: string;
      text: string;
      contactHandle: string;
      providerConversationId: string;
      providerMetadata: Record<string, unknown>;
      attachmentIds: string[];
    };
    const stored: Stored[] = [];
    const mime = () =>
      Buffer.from(
        'From: client@example.com\r\nTo: inbox@example.com\r\nMessage-ID: <reused@example.com>\r\nContent-Type: multipart/mixed; boundary="fixture"\r\n\r\n--fixture\r\nContent-Type: text/plain\r\n\r\nSame text\r\n--fixture\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename="fixture.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\n' +
          Buffer.from('%PDF-1.7\nPart ' + bodyUid).toString('base64') +
          '\r\n--fixture--\r\n',
      );
    f.client.search.mockImplementation(async () => [uid]);
    f.client.fetchAll.mockImplementation(async (_range, query) =>
      query.source
        ? ([{ uid, source: mime() }] as never)
        : ([
            {
              uid,
              size: mime().length,
              envelope: { from: [{ address: 'client@example.com' }] },
            },
          ] as never),
    );
    f.messages.findOne.mockImplementation(async (options) => {
      const where = (options as { where: Record<string, unknown> }).where;
      const raw = where.providerMetadata as
        | {
            getSql?: (alias: string) => string;
            objectLiteralParameters?: Record<string, unknown>;
          }
        | undefined;
      const params = raw?.objectLiteralParameters ?? {};
      const sql = raw?.getSql?.('metadata') ?? '';
      const found = stored.find(
        (row) =>
          Object.entries(where).every(
            ([key, value]) =>
              key === 'providerMetadata' || row[key as keyof Stored] === value,
          ) &&
          (!params.mailRfcId ||
            row.providerMetadata.rfcMessageId === params.mailRfcId) &&
          (!params.mailMimeSha256 ||
            row.providerMetadata.mimeSha256 === params.mailMimeSha256) &&
          (!sql.includes('IS NULL') || !row.providerMetadata.mimeSha256),
      );
      return found
        ? ({
            ...found,
            conversation: {
              contactHandle: found.contactHandle,
              providerConversationId: found.providerConversationId,
            },
          } as never)
        : (null as never);
    });
    f.inbox.ingest.mockImplementation(async (raw) => {
      stored.push(raw as Stored);
      return {
        conversationId,
        messageId: 'fixture-message-' + stored.length,
        replay: false,
      };
    });
    expect(await f.service.sync(actor)).toMatchObject({ received: 1 });
    uid = 13;
    bodyUid = 13;
    expect(await f.service.sync(actor)).toMatchObject({
      received: 1,
      replayed: 0,
    });
    expect(stored).toHaveLength(2);
    expect(stored[0].providerMetadata.mimeSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(stored[0].providerMetadata.mimeSha256).not.toBe(
      stored[1].providerMetadata.mimeSha256,
    );
    expect(stored[0].text).toBe(stored[1].text);
    expect(stored[0].providerMetadata.rfcMessageId).toBe(
      stored[1].providerMetadata.rfcMessageId,
    );
    expect(stored[0].providerMessageId).not.toBe(stored[1].providerMessageId);
    expect(stored[0].attachmentIds).not.toEqual(stored[1].attachmentIds);
    expect(f.inbox.ingest.mock.calls[1][1]).toEqual(
      expect.objectContaining({ suppressAutomation: true, observedOnly: true }),
    );
    uid = 14;
    expect(await f.service.sync(actor)).toMatchObject({
      received: 0,
      replayed: 1,
    });
    expect(stored).toHaveLength(2);
    // Native MOVE changes physical UIDs while preserving the complete MIME.
    const move = jest.fn(async (_oldUid: string, destination: string) => {
      uid = destination === 'Archive' ? 20 : 30;
      return { uidValidity: 123n, uidMap: new Map([[Number(_oldUid), uid]]) };
    });
    f.imap.getClient.mockImplementation(
      async () =>
        ({
          ...f.client,
          list: async () =>
            ['INBOX', 'Archive'].map((path) => ({ path, flags: new Set() })),
          messageMove: move,
        }) as never,
    );
    const mailbox = new HermesMailboxService(
      f.service,
      f.imap as never,
      f.access as never,
    );
    await mailbox.update(actor, {
      folder: 'INBOX',
      uid: '14',
      uidValidity: '123',
      destination: 'Archive',
    });
    await mailbox.update(actor, {
      folder: 'Archive',
      uid: '20',
      uidValidity: '123',
      destination: 'INBOX',
    });
    expect(await f.service.sync(actor)).toMatchObject({
      received: 0,
      replayed: 1,
    });
    expect(move).toHaveBeenCalledTimes(2);
    expect(stored).toHaveLength(2);
    delete stored[1].providerMetadata.mimeSha256;
    uid = 15;
    expect(await f.service.sync(actor)).toMatchObject({
      received: 1,
      replayed: 0,
    });
    expect(stored).toHaveLength(3);
    expect(f.inbox.ingest.mock.calls[2][1]).toEqual(
      expect.objectContaining({ suppressAutomation: true, observedOnly: true }),
    );
  });
  it('imports the first native baseline as observed without running automation', async () => {
    const f = fixture();
    f.cursors.findOneBy.mockResolvedValue(null as never);
    expect(await f.service.sync(actor)).toMatchObject({ received: 1 });
    expect(f.inbox.ingest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ suppressAutomation: true, observedOnly: true }),
    );
    expect(f.transport.sendMail).not.toHaveBeenCalled();
  });
  it('retains authenticated IMAP arrival time through observation instead of trusting a forged Date header', async () => {
    const f = fixture();
    const source = Buffer.from(
      'From: client@example.com\r\nDate: Fri, 30 Oct 2037 12:00:00 +0000\r\nMessage-ID: <arrival-proof@example.com>\r\n\r\nHello',
    );
    const internalDate = new Date('2026-10-30T12:00:00.000Z');
    f.client.fetchAll.mockImplementation(async (_range, query) =>
      query.source
        ? ([{ uid: 12, source, internalDate }] as never)
        : ([
            {
              uid: 12,
              size: source.length,
              internalDate,
              envelope: { from: [{ address: 'client@example.com' }] },
            },
          ] as never),
    );
    expect(await f.service.sync(actor)).toMatchObject({ received: 1 });
    expect(f.inbox.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: '2026-10-30T12:00:00.000Z' }),
      expect.any(Object),
    );
  });
});

it('HERMES-V4-MAIL-003 observes Sent Bcc-only under the own mailbox contact without exposing private recipients', async () => {
  const f = fixture();
  const result = await f.service.observe(
    actor,
    { folder: 'Sent', uid: '50', uidValidity: '123' },
    {
      headers: [],
      headerLines: [],
      attachments: [],
      from: { name: '', address: 'inbox@example.com' },
      to: [{ name: '', address: 'inbox@example.com' }],
      bcc: [{ name: '', address: 'private@example.org' }],
      messageId: '<private-sent@example.org>',
      subject: 'Private',
      text: 'Secret body',
    },
  );
  expect(result).toMatchObject({
    contactHandle: 'inbox@example.com',
    direction: 'OUTBOUND',
    botUnavailableReason: 'MAIL_PRIVATE_OR_SELF_RECIPIENT',
  });
  expect(f.inbox.ingest).toHaveBeenCalledWith(
    expect.objectContaining({
      contactHandle: 'inbox@example.com',
      direction: 'OUTBOUND',
    }),
    expect.objectContaining({ observedOnly: true, suppressAutomation: true }),
  );
  expect(JSON.stringify(f.inbox.ingest.mock.calls)).not.toContain(
    'private@example.org',
  );
});

it('reserves native Sent-copy attempts durably on an accepted canonical receipt and never upgrades an unconfirmed send', async () => {
  const f = fixture();
  const requestId = 'e4d16125-1299-4b15-aa57-d193a423b4e9';
  const rfcMessageId = '<' + requestId + '@example.com>';
  const canonical = {
    id: 'canonical-receipt',
    workspaceId,
    conversationId,
    channel: 'EMAIL',
    status: 'ACCEPTED',
    providerConnectionId: 'company-inbox',
    providerMessageId: rfcMessageId,
    providerMetadata: {},
  };
  const reserved = {
    ...canonical,
    id: 'reserved',
    canonicalMessageId: canonical.id,
    clientRequestId: requestId,
  };
  const repository = {
    findOneBy: jest.fn(
      async (where: Record<string, unknown>) =>
        [reserved, canonical].find((row) =>
          Object.entries(where).every(
            ([key, value]) => row[key as keyof typeof row] === value,
          ),
        ) ?? null,
    ),
    update: jest.fn(
      async (_where: unknown, value: { providerMetadata: unknown }) => {
        canonical.providerMetadata = value.providerMetadata as {};
        return { affected: 1 };
      },
    ),
  };
  const manager = {
    query: jest.fn(),
    getRepository: (target: { name: string }) =>
      target.name === 'HermesInboxMessageEntity'
        ? repository
        : {
            findOne: async () =>
              target.name === 'ConnectedAccountEntity'
                ? f.account
                : { id: memberId, userId, workspaceId },
          },
  };
  Object.assign(f.messages, {
    manager: {
      transaction: async (run: (value: unknown) => unknown) => run(manager),
    },
  });
  const input = {
    messageId: reserved.id,
    conversationId,
    clientRequestId: requestId,
    connectionId: 'company-inbox',
    connectionRevision: (await f.service.connection(workspaceId))!.revision,
    accountId,
    rfcMessageId,
  };
  expect(
    await f.service.recordSentCopy(
      actor,
      { ...input, action: 'RESERVE' },
      () => {},
    ),
  ).toEqual({ appendAllowed: true });
  expect(canonical.providerMetadata).toEqual({ sentCopyState: 'PENDING' });
  expect(
    await f.service.recordSentCopy(
      actor,
      { ...input, action: 'RESERVE' },
      () => {},
    ),
  ).toEqual({ appendAllowed: false });
  await f.service.recordSentCopy(
    actor,
    { ...input, action: 'UNCONFIRMED' },
    () => {},
  );
  expect(
    await f.service.recordSentCopy(
      actor,
      { ...input, action: 'RESERVE' },
      () => {},
    ),
  ).toEqual({ appendAllowed: false });
  await f.service.recordSentCopy(
    actor,
    {
      ...input,
      action: 'SAVED',
      scope: {
        folder: 'Sent',
        uid: '50',
        uidValidity: '123',
        mimeSha256: 'a'.repeat(64),
      },
    },
    () => {},
  );
  expect(canonical).toMatchObject({
    status: 'ACCEPTED',
    providerMetadata: {
      sentCopyState: 'SAVED',
      uid: 50,
      mimeSha256: 'a'.repeat(64),
    },
  });
  reserved.status = 'UNCONFIRMED';
  await expect(
    f.service.recordSentCopy(
      actor,
      {
        ...input,
        action: 'SAVED',
        scope: {
          folder: 'Sent',
          uid: '51',
          uidValidity: '123',
          mimeSha256: 'b'.repeat(64),
        },
      },
      () => {},
    ),
  ).rejects.toThrow('MAIL_CONNECTION_UNAVAILABLE');
  expect(canonical).toMatchObject({
    status: 'ACCEPTED',
    providerMetadata: { uid: 50 },
  });
});

it('reads a proven native Sent MIME copy through its accepted canonical receipt without creating another message or private asset', async () => {
  const media = {
    receive: jest.fn(),
    attachment: jest.fn(async () => ({
      assetId: 'asset',
      filename: 'fixture.pdf',
    })),
  };
  const f = fixture(undefined, media);
  f.messages.findOne.mockResolvedValue({
    id: 'accepted-canonical',
    conversationId,
    providerMessageId: '<receipt@example.com>',
    direction: 'OUTBOUND',
    providerMetadata: { mimeSha256: 'a'.repeat(64), sentCopyState: 'SAVED' },
    attachmentIds: ['asset'],
    conversation: {
      contactHandle: 'client@example.com',
      providerConversationId: 'draft:original',
    },
  } as never);
  const result = await f.service.observe(
    actor,
    { folder: 'Sent', uid: '50', uidValidity: '123' },
    {
      headers: [],
      headerLines: [],
      attachments: [],
      from: { name: '', address: 'inbox@example.com' },
      to: [{ name: '', address: 'client@example.com' }],
      messageId: '<receipt@example.com>',
      text: 'Hello',
    },
    true,
    () => {},
    'a'.repeat(64),
  );
  expect(result).toMatchObject({
    conversationId,
    messageId: 'accepted-canonical',
    replay: true,
    attachments: [{ assetId: 'asset' }],
  });
  expect(f.inbox.ingest).not.toHaveBeenCalled();
  expect(media.receive).not.toHaveBeenCalled();
  expect(media.attachment).toHaveBeenCalledWith(
    workspaceId,
    'asset',
    conversationId,
  );
});

it('freezes a stable draft against new send request ids after uncertainty while allowing the exact ledger request to replay', async () => {
  const f = fixture();
  const originalRequest = 'e4d16125-1299-4b15-aa57-d193a423b4e9';
  f.messages.findOne.mockResolvedValue({
    clientRequestId: originalRequest,
    status: 'UNCONFIRMED',
  } as never);
  const draft = {
    clientRequestId: 'e4d16125-1299-4b15-aa57-d193a423b4e6',
    contactHandle: 'client@example.com',
    subject: 'Draft',
  };
  await expect(
    f.service.draftConversation(actor, draft, () => {}, false, originalRequest),
  ).resolves.toMatchObject({ id: conversationId });
  f.inbox.ensureEmailDraftConversation.mockClear();
  await expect(
    f.service.draftConversation(
      actor,
      draft,
      () => {},
      false,
      'e4d16125-1299-4b15-aa57-d193a423b4e8',
    ),
  ).rejects.toThrow('MAIL_DRAFT_ALREADY_RESERVED');
  expect(f.inbox.ensureEmailDraftConversation).not.toHaveBeenCalled();
  expect(f.transport.sendMail).not.toHaveBeenCalled();
});

it.each([
  ['Auto-Submitted: auto-replied; owner-email="loop@example.com"', true],
  ['Auto-Submitted: auto-generated', true],
  ['Auto-Submitted: no; owner-email="human@example.com"', false],
  ['Return-Path: <>', true],
  ['Precedence: bulk', true],
  ['List-Id: fixture.example.org', true],
  [
    'Content-Type: multipart/report; report-type=delivery-status; boundary="report"',
    true,
  ],
  ['', false],
])(
  'MAIL-004 blocks automatic responses from native MIME without dropping human-visible mail (%s)',
  async (header, blocked) => {
    const f = fixture();
    const source = Buffer.from(
      'From: client@example.com\r\nMessage-ID: <loop-fixture@example.com>\r\n' +
        (header ? header + '\r\n' : '') +
        '\r\nHello',
    );
    f.client.fetchAll.mockImplementation(async (_range, query) =>
      query.source
        ? [{ uid: 12, source }]
        : ([
            {
              uid: 12,
              size: source.length,
              envelope: { from: [{ address: 'client@example.com' }] },
            },
          ] as never),
    );
    expect(await f.service.sync(actor)).toMatchObject({ received: 1 });
    expect(f.inbox.ingest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        suppressAutomation: blocked,
        observedOnly: false,
      }),
    );
    expect(f.transport.sendMail).not.toHaveBeenCalled();
  },
);
