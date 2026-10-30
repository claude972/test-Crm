import {
  mailAddress,
  mailMessageId,
  mailProviderId,
  parseHermesMail,
  readHermesMailBindings,
} from 'src/engine/core-modules/hermes-mail/hermes-mail.policy';

const workspaceId = 'b9c2e7ad-67ed-42be-b687-1a410e60b5ba';
const account = 'e4d16125-1299-4b15-aa57-d193a423b4e6';
const member = 'e4d16125-1299-4b15-aa57-d193a423b4e7';
const parse = (raw: string, ownAddress?: string) =>
  parseHermesMail({
    source: Buffer.from(raw),
    workspaceId,
    connectionId: 'mail-a',
    mailbox: 'INBOX',
    uid: 12,
    uidValidity: '456',
    ownAddress,
  });

describe('Hermes native mailbox policy', () => {
  it('does not invent a configured mailbox', () =>
    expect(readHermesMailBindings('{}').size).toBe(0));
  it('binds only explicit workspace/account/delegating member', () => {
    const result = readHermesMailBindings(
      JSON.stringify({
        [workspaceId]: {
          connectionId: 'mail-a',
          connectedAccountId: account,
          userWorkspaceId: member,
        },
      }),
    );
    expect(result.get(workspaceId)).toEqual({
      connectionId: 'mail-a',
      connectedAccountId: account,
      userWorkspaceId: member,
      mailbox: 'INBOX',
    });
  });
  it.each([
    { arbitrary: {} },
    {
      [workspaceId]: {
        connectionId: 'x',
        connectedAccountId: account,
        userWorkspaceId: member,
        password: 'never-accepted',
      },
    },
    {
      [workspaceId]: {
        connectionId: 'x',
        connectedAccountId: account,
        userWorkspaceId: member,
        mailbox: 'INBOX\r\nLOGOUT',
      },
    },
  ])('rejects unsafe or undeclared configuration', (value) =>
    expect(() => readHermesMailBindings(JSON.stringify(value))).toThrow(
      'MAIL_CONFIG_INVALID',
    ),
  );
  it('refuses recipient and header injection', () => {
    expect(mailAddress('a@example.com\r\nBcc:b@example.com')).toBeNull();
    expect(mailAddress('Name <a@example.com>')).toBeNull();
    expect(mailAddress(' A@Example.com ')).toBe('a@example.com');
    expect(mailMessageId('<x@example.com>\r\nBcc:x')).toBeNull();
  });
  it('preserves real Message-ID and earliest References for threading', async () => {
    const event = await parse(
      'From: Customer <person@example.com>\r\nTo: inbox@example.com\r\nMessage-ID: <reply@example.com>\r\nReferences: <root@example.com> <previous@example.com>\r\nSubject: Re: Quote\r\nDate: Thu, 29 Oct 2026 12:00:00 +0000\r\n\r\nHello',
    );
    expect(event).toMatchObject({
      workspaceId,
      channel: 'EMAIL',
      direction: 'INBOUND',
      contactHandle: 'person@example.com',
      providerMessageId: 'imap:INBOX:456:12',
      providerMetadata: { rfcMessageId: '<reply@example.com>' },
      providerConversationId: '<root@example.com>',
      text: 'Hello',
      subject: 'Re: Quote',
      occurredAt: '2026-10-29T12:00:00.000Z',
    });
  });
  it('never converts an untrusted From header into outbound acceptance', async () => {
    const event = await parse(
      'From: inbox@example.com\r\nTo: person@example.com\r\nMessage-ID: <out@example.com>\r\nIn-Reply-To: <root@example.com>\r\n\r\nReply',
      'inbox@example.com',
    );
    expect(event).toMatchObject({
      direction: 'INBOUND',
      contactHandle: 'inbox@example.com',
      providerConversationId: '<root@example.com>',
    });
  });
  it('uses stable UIDVALIDITY identity when the sender omitted Message-ID', async () => {
    const one = await parse('From: person@example.com\r\n\r\nHello');
    const two = await parse('From: person@example.com\r\n\r\nHello');
    expect(one?.providerMessageId).toBe('imap:INBOX:456:12');
    expect(one?.providerMessageId).toBe(two?.providerMessageId);
  });
  it('keeps different physical deliveries when a sender reuses Message-ID', async () => {
    const source = (body: string) =>
      Buffer.from(
        'From: person@example.com\r\nMessage-ID: <reused@example.com>\r\n\r\n' +
          body,
      );
    const args = {
      workspaceId,
      connectionId: 'mail-a',
      mailbox: 'INBOX',
      uidValidity: '456',
    };
    const first = await parseHermesMail({
      ...args,
      uid: 12,
      source: source('First'),
    });
    const second = await parseHermesMail({
      ...args,
      uid: 13,
      source: source('Changed'),
    });
    expect(first?.providerMessageId).not.toBe(second?.providerMessageId);
    expect(first?.providerConversationId).toBe(second?.providerConversationId);
    expect(first?.providerMetadata?.rfcMessageId).toBe('<reused@example.com>');
    expect(second?.text).toBe('Changed');
  });
  it('does not execute or retain HTML markup', async () => {
    const event = await parse(
      'From: person@example.com\r\nContent-Type: text/html\r\n\r\n<p>Hello</p><img src="https://example.com/tracker">',
    );
    expect(event?.text).toBe('Hello');
  });
  it('bounds long text explicitly and hashes oversized provider identifiers', async () => {
    const id = '<' + 'x'.repeat(300) + '@example.com>';
    const event = await parse(
      'From: person@example.com\r\nMessage-ID: ' +
        id +
        '\r\n\r\n' +
        'x'.repeat(21000),
    );
    expect(event?.providerMessageId).toBe('imap:INBOX:456:12');
    expect(event?.providerMetadata?.rfcMessageId).toBe(id);
    expect(event!.text.length).toBeLessThanOrEqual(10000);
    expect(event?.text).toContain('truncated');
  });
});
