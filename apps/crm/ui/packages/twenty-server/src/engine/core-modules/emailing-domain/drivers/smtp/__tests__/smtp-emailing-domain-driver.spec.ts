import { createServer, type Server, type Socket } from 'node:net';

import { SmtpEmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/smtp/smtp-emailing-domain-driver';
import { type EmailingDomainSendEmailRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-input.type';
import { type EmailingDomainSendEmailBatchRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-batch-request.type';
import { UnsubscribeContentService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-content.service';
import { type UnsubscribeTokenService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service';

jest.mock(
  'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service',
  () => ({ UnsubscribeTokenService: class {} }),
);

const WORKSPACE_ID = '0cd3fa15-c8df-4e88-9660-d559a464d395';
const OTHER_WORKSPACE_ID = '29d1892b-d56e-47c5-a80b-484f028cce2d';
const DOMAIN = 'sender.example.test';

// Cold filesystem contention must not turn a real socket check into a 5s race.
jest.setTimeout(30_000);

type RecordedMessage = { recipients: string[]; content: string };

describe('SmtpEmailingDomainDriver with a loopback SMTP protocol fixture', () => {
  let server: Server;
  let driver: SmtpEmailingDomainDriver;
  let port: number;
  let connections: number;
  let messages: RecordedMessage[];
  let loseReceipt: boolean;
  const sockets = new Set<Socket>();
  const sign = jest.fn(({ emailAddress }: { emailAddress: string }) =>
    Buffer.from(emailAddress).toString('base64url'),
  );
  const unsubscribe = new UnsubscribeContentService({
    sign,
  } as unknown as UnsubscribeTokenService);

  const configuration = (overrides = {}) =>
    JSON.stringify({
      [WORKSPACE_ID]: {
        host: '127.0.0.1',
        port,
        security: 'plaintext-loopback',
        senderDomains: [DOMAIN],
        ...overrides,
      },
    });
  const request = (
    overrides: Partial<EmailingDomainSendEmailRequest> = {},
  ): EmailingDomainSendEmailRequest => ({
    workspaceId: WORKSPACE_ID,
    domain: DOMAIN,
    emailingDomain: {
      workspaceId: WORKSPACE_ID,
      domain: DOMAIN,
    } as EmailingDomainSendEmailRequest['emailingDomain'],
    sendKind: 'MARKETING',
    from: `Hermes <campaign@${DOMAIN}>`,
    to: ['recipient@example.test'],
    subject: 'Synthetic campaign',
    text: 'Fixture message only',
    html: '<p>Fixture message only</p>',
    ...overrides,
  });
  const batch = (
    overrides: Partial<EmailingDomainSendEmailBatchRequest> = {},
  ): EmailingDomainSendEmailBatchRequest => ({
    workspaceId: WORKSPACE_ID,
    domain: DOMAIN,
    emailingDomain: request().emailingDomain,
    sendKind: 'MARKETING',
    from: `campaign@${DOMAIN}`,
    template: {
      subject: 'Hello {{firstName}}',
      text: 'Only for {{firstName}}',
    },
    recipients: [
      { email: 'alice@example.test', replacements: { firstName: 'Alice' } },
      { email: 'bob@example.test', replacements: { firstName: 'Bob' } },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    jest.useRealTimers();
    sign.mockClear();
    messages = [];
    connections = 0;
    loseReceipt = false;
    server = createServer((socket) => {
      connections++;
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
      socket.setEncoding('utf8');
      socket.write('220 fixture.example.test ESMTP\r\n');
      let buffer = '';
      let data = false;
      let content: string[] = [];
      let recipients: string[] = [];
      socket.on('data', (chunk) => {
        buffer += chunk;
        while (buffer.includes('\r\n')) {
          const boundary = buffer.indexOf('\r\n');
          const line = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (data) {
            if (line === '.') {
              messages.push({
                recipients: [...recipients],
                content: content.join('\r\n'),
              });
              data = false;
              content = [];
              recipients = [];
              if (loseReceipt) {
                socket.destroy();
                return;
              }
              socket.write('250 fixture accepted, not delivered\r\n');
            } else content.push(line.replace(/^\.\./, '.'));
          } else if (/^(EHLO|HELO) /i.test(line))
            socket.write('250-fixture.example.test\r\n250 PIPELINING\r\n');
          else if (/^MAIL FROM:/i.test(line)) {
            recipients = [];
            socket.write('250 sender accepted\r\n');
          } else if (/^RCPT TO:/i.test(line)) {
            const address = line.match(/<([^>]+)>/)?.[1] ?? '';
            if (address === 'rejected@example.test')
              socket.write('550 synthetic recipient rejected\r\n');
            else {
              recipients.push(address);
              socket.write('250 recipient accepted\r\n');
            }
          } else if (line === 'DATA') {
            if (!recipients.length)
              socket.write('554 no accepted recipients\r\n');
            else {
              data = true;
              socket.write('354 send synthetic content\r\n');
            }
          } else if (line === 'QUIT') socket.end('221 goodbye\r\n');
          else socket.write('250 OK\r\n');
        }
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Loopback fixture did not bind');
    port = address.port;
    driver = new SmtpEmailingDomainDriver(
      configuration(),
      'https://crm.example.test',
      unsubscribe,
    );
  });

  afterEach(async () => {
    driver.close();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('SMTP fixture cleanup exceeded 5 seconds')),
        5000,
      );
      server.close((error) => {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it.each([
    { workspaceId: OTHER_WORKSPACE_ID },
    { domain: 'other.example.test' },
    { emailingDomain: { workspaceId: OTHER_WORKSPACE_ID, domain: DOMAIN } },
    {
      emailingDomain: {
        workspaceId: WORKSPACE_ID,
        domain: 'other.example.test',
      },
    },
    { from: 'outsider@other.example.test' },
    { from: `a@${DOMAIN}, b@${DOMAIN}` },
    { from: `a@${DOMAIN}\r\nBcc: injected@example.test` },
  ])(
    'rejects workspace/domain/from mismatch before SMTP: %j',
    async (change) => {
      await expect(
        driver.sendEmail(
          request(change as Partial<EmailingDomainSendEmailRequest>),
        ),
      ).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
      expect(connections).toBe(0);
    },
  );

  it.each([
    { host: 'outside.example.test' },
    { username: 'fixture-user' },
    { port: 0 },
    { security: 'disabled' },
    { password: 'configuration-secret-sentinel' },
  ])('rejects unsafe configuration without exposing details: %j', (change) => {
    try {
      new SmtpEmailingDomainDriver(
        configuration(change),
        'https://crm.example.test',
        unsubscribe,
      );
      throw new Error('Expected rejection');
    } catch (error) {
      expect(error).toMatchObject({ code: 'CONFIGURATION_ERROR' });
      expect(String(error)).not.toMatch(
        /configuration-secret-sentinel|outside\.example\.test|fixture-user/,
      );
    }
    expect(connections).toBe(0);
  });

  it.each([
    'http://crm.example.test',
    'https://user:secret@crm.example.test',
    'https://crm.example.test/path',
  ])('rejects invalid unsubscribe origin %s', (origin) => {
    expect(
      () => new SmtpEmailingDomainDriver(configuration(), origin, unsubscribe),
    ).toThrow('SMTP campaign connection is not configured');
  });

  it.each([
    { name: 'X-Test\r\nBcc', value: 'injected@example.test' },
    { name: 'X-Test', value: 'value\r\nBcc: injected@example.test' },
  ])('rejects header injection before SMTP', async (header) => {
    await expect(
      driver.sendEmail(request({ headers: [header] })),
    ).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
    expect(connections).toBe(0);
  });

  it('sends actual Nodemailer SMTP DATA with mandatory per-recipient unsubscribe headers and footer', async () => {
    const result = await driver.sendEmail(request());
    expect(messages).toHaveLength(1);
    expect(messages[0].recipients).toEqual(['recipient@example.test']);
    expect(messages[0].content).toContain('Subject: Synthetic campaign');
    expect(messages[0].content).toContain('Fixture message only');
    expect(messages[0].content.replace(/\r\n[ \t]+/g, ' ')).toMatch(
      /List-Unsubscribe: <https:\/\/crm\.example\.test\//i,
    );
    expect(messages[0].content).toMatch(
      /List-Unsubscribe-Post: List-Unsubscribe=One-Click/i,
    );
    expect(sign).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      emailAddress: 'recipient@example.test',
    });
    expect(result.messageId).toEqual(expect.any(String));
    expect(result.headerMessageId).toBe(result.messageId);
    expect(result.deliveredRecipients.to).toEqual(['recipient@example.test']);
    // A positive SMTP receipt is acceptance only; this fixture delivers nowhere.
    expect(result).not.toHaveProperty('deliveredAt');
  });

  it('reports only accepted SMTP recipients when a transactional envelope is partially rejected', async () => {
    const result = await driver.sendEmail(
      request({
        sendKind: 'TRANSACTIONAL',
        to: ['recipient@example.test', 'rejected@example.test'],
      }),
    );
    expect(result.deliveredRecipients.to).toEqual(['recipient@example.test']);
    expect(messages[0].recipients).toEqual(['recipient@example.test']);
    expect(sign).not.toHaveBeenCalled();
  });

  it('matches a display-name recipient against the bare SMTP envelope receipt', async () => {
    const recipient = 'Synthetic Recipient <recipient@example.test>';
    const result = await driver.sendEmail(request({ to: [recipient] }));
    expect(messages[0].recipients).toEqual(['recipient@example.test']);
    expect(result.deliveredRecipients.to).toEqual([recipient]);
  });

  it.each(['List-Unsubscribe', 'list-unsubscribe-post'])(
    'rejects caller override of the mandatory %s header',
    async (name) => {
      await expect(
        driver.sendEmail(
          request({
            headers: [{ name, value: '<https://untrusted.example.test>' }],
          }),
        ),
      ).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
      const input = batch();
      input.recipients[1].headers = [
        { name, value: '<https://untrusted.example.test>' },
      ];
      await expect(driver.sendEmailBatch(input)).rejects.toMatchObject({
        code: 'CONFIGURATION_ERROR',
      });
      expect(connections).toBe(0);
    },
  );

  it('does not leak transport diagnostics or mark an unconfirmed send retryable', async () => {
    await expect(
      driver.sendEmail(request({ to: ['rejected@example.test'] })),
    ).rejects.toMatchObject({
      code: 'SEND_OUTCOME_UNCONFIRMED',
      message:
        'SMTP send outcome could not be confirmed; reconcile before retrying',
    });
    expect(messages).toHaveLength(0);
  });

  it('quarantines a lost receipt after actual DATA without sending the same message again', async () => {
    loseReceipt = true;
    await expect(driver.sendEmail(request())).rejects.toMatchObject({
      code: 'SEND_OUTCOME_UNCONFIRMED',
    });
    expect(messages).toHaveLength(1);
    expect(messages[0].recipients).toEqual(['recipient@example.test']);
  });

  it('preserves the unconfirmed code for every batch recipient whose DATA receipt was lost', async () => {
    loseReceipt = true;
    const result = await driver.sendEmailBatch(batch());
    expect(result.entries).toHaveLength(2);
    expect(
      result.entries.every(
        (entry) =>
          entry.messageId === null &&
          entry.errorCode === 'SEND_OUTCOME_UNCONFIRMED',
      ),
    ).toBe(true);
    expect(messages.map((message) => message.recipients)).toEqual([
      ['alice@example.test'],
      ['bob@example.test'],
    ]);
  });

  it('refuses marketing envelopes with multiple recipients before any SMTP connection', async () => {
    await expect(
      driver.sendEmail(request({ cc: ['second@example.test'] })),
    ).rejects.toMatchObject({ code: 'UNSUBSCRIBE_MULTIPLE_RECIPIENTS' });
    expect(connections).toBe(0);
  });

  it('sends one marketing envelope per batch recipient with their own replacements and unsubscribe token', async () => {
    const result = await driver.sendEmailBatch(batch());
    expect(result.entries).toHaveLength(2);
    expect(
      result.entries.every(
        (entry) => entry.messageId && entry.errorMessage === null,
      ),
    ).toBe(true);
    expect(messages.map((message) => message.recipients)).toEqual([
      ['alice@example.test'],
      ['bob@example.test'],
    ]);
    expect(messages[0].content).toContain('Subject: Hello Alice');
    expect(messages[1].content).toContain('Subject: Hello Bob');
    expect(sign.mock.calls.map(([payload]) => payload.emailAddress)).toEqual([
      'alice@example.test',
      'bob@example.test',
    ]);
    for (const [index, message] of messages.entries()) {
      expect(message.content.match(/^List-Unsubscribe:/gim)).toHaveLength(1);
      const decoded = message.content
        .replace(/=\r\n/g, '')
        .replace(/=([A-F0-9]{2})/g, (_match, hex: string) =>
          String.fromCharCode(parseInt(hex, 16)),
        );
      expect(decoded).not.toMatch(/\{\{v_url_unsubscribe/);
      expect(decoded).toContain(
        Buffer.from(['alice@example.test', 'bob@example.test'][index]).toString(
          'base64url',
        ),
      );
      expect(decoded.match(/Unsubscribe: https:/g)).toHaveLength(1);
    }
  });

  it('isolates a failed batch recipient and retains successful receipts without suggesting a retry', async () => {
    const input = batch();
    input.recipients[0].email = 'rejected@example.test';
    const result = await driver.sendEmailBatch(input);
    expect(result.entries[0]).toMatchObject({
      recipientIndex: 0,
      messageId: null,
      errorMessage: 'SMTP outcome unconfirmed; reconcile before retrying',
    });
    expect(result.entries[1]).toMatchObject({
      recipientIndex: 1,
      messageId: expect.any(String),
      errorMessage: null,
    });
    expect(messages.map((message) => message.recipients)).toEqual([
      ['bob@example.test'],
    ]);
  });

  it('rejects a batch row containing multiple envelope addresses before SMTP', async () => {
    const input = batch();
    input.recipients[0].email = 'alice@example.test, bob@example.test';
    await expect(driver.sendEmailBatch(input)).rejects.toMatchObject({
      code: 'CONFIGURATION_ERROR',
    });
    expect(connections).toBe(0);
  });

  it.each([0, 101])(
    'rejects unsupported batch size %i before transport',
    async (size) => {
      await expect(
        driver.sendEmailBatch(
          batch({
            recipients: Array.from({ length: size }, () => ({
              email: 'recipient@example.test',
              replacements: {},
            })),
          }),
        ),
      ).rejects.toMatchObject({ code: 'CONFIGURATION_ERROR' });
      expect(connections).toBe(0);
    },
  );
});
