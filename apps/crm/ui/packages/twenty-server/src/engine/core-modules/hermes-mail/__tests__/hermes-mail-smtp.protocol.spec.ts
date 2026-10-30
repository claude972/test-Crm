import { randomUUID } from 'node:crypto';
import { createServer, type Socket } from 'node:net';
import nodemailer from 'nodemailer';
import PostalMime from 'postal-mime';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';
import { HermesMailService } from '../hermes-mail.service';
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

beforeEach(() => jest.useRealTimers());

async function smtpFixture(dropAcknowledgement = false) {
  const sockets = new Set<Socket>();
  const captured: { recipients: string[]; raw: Buffer }[] = [];
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.write('220 Hermes isolated SMTP fixture\r\n');
    let buffer = '',
      inData = false;
    let recipients: string[] = [];
    socket.on('data', (chunk) => {
      buffer += chunk.toString('binary');
      while (buffer.length) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          captured.push({
            recipients: [...recipients],
            raw: Buffer.from(
              buffer.slice(0, end).replace(/\r\n\.\./g, '\r\n.'),
              'binary',
            ),
          });
          buffer = buffer.slice(end + 5);
          inData = false;
          if (dropAcknowledgement) {
            socket.destroy();
            return;
          }
          socket.write('250 2.0.0 synthetic-queued\r\n');
          continue;
        }
        const end = buffer.indexOf('\r\n');
        if (end < 0) return;
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (/^EHLO /i.test(line))
          socket.write('250-hermes.invalid\r\n250 SIZE 40000000\r\n');
        else if (/^HELO /i.test(line)) socket.write('250 hermes.invalid\r\n');
        else if (/^MAIL FROM:/i.test(line)) {
          recipients = [];
          socket.write('250 2.1.0 synthetic-sender\r\n');
        } else if (/^RCPT TO:/i.test(line)) {
          recipients.push(line.slice(8).trim().replace(/^<|>$/g, ''));
          socket.write('250 2.1.5 synthetic-recipient\r\n');
        } else if (/^DATA$/i.test(line)) {
          inData = true;
          socket.write('354 synthetic-data\r\n');
        } else if (/^QUIT$/i.test(line)) socket.end('221 synthetic-bye\r\n');
        else socket.write('250 synthetic-ok\r\n');
      }
    });
    socket.on('error', () => {});
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('NO_LOOPBACK_PORT');
  const transport = nodemailer.createTransport({
    host: '127.0.0.1',
    port: address.port,
    secure: false,
    ignoreTLS: true,
    connectionTimeout: 2000,
    greetingTimeout: 2000,
    socketTimeout: 2000,
  });
  return {
    captured,
    transport,
    close: async () => {
      transport.close();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

function service(transport: ReturnType<typeof nodemailer.createTransport>) {
  const workspaceId = randomUUID(),
    userWorkspaceId = randomUUID(),
    accountId = randomUUID(),
    conversationId = randomUUID();
  const account = {
    id: accountId,
    workspaceId,
    userWorkspaceId,
    handle: 'mailbox@example.com',
    handleAliases: [],
    provider: ConnectedAccountProvider.IMAP_SMTP_CALDAV,
    authFailedAt: null,
    connectionParameters: {
      IMAP: { connectionSecurity: 'SSL_TLS' },
      SMTP: { connectionSecurity: 'STARTTLS' },
    },
  };
  const binding = JSON.stringify({
    [workspaceId]: {
      connectionId: 'synthetic-mail',
      connectedAccountId: accountId,
      userWorkspaceId,
    },
  });
  const instance = new HermesMailService(
    { get: () => binding } as never,
    { findOne: async () => account } as never,
    {
      findOne: async () => ({
        id: userWorkspaceId,
        workspaceId,
        userId: randomUUID(),
      }),
    } as never,
    {} as never,
    {
      findOneBy: async () => ({
        id: conversationId,
        workspaceId,
        providerConnectionId: 'synthetic-mail',
        channel: 'EMAIL',
      }),
    } as never,
    {} as never,
    { assertAllowed: async () => {} } as never,
    {} as never,
    { getClient: async () => transport } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return {
    instance,
    input: {
      workspaceId,
      conversationId,
      providerConnectionId: 'synthetic-mail',
      contactHandle: 'to@example.com',
      clientRequestId: randomUUID(),
      text: 'Synthetic fixture only',
      email: {
        from: account.handle,
        to: ['to@example.com'],
        cc: ['cc@example.com'],
        bcc: ['hidden@example.com'],
        subject: 'Synthetic MIME',
        text: 'Synthetic fixture only',
        html: '<p>Synthetic</p><img src="https://tracker.invalid/x">',
        references: [],
      },
      attachments: [
        {
          assetId: randomUUID(),
          kind: 'FILE' as const,
          mimeType: 'application/pdf',
          filename: 'fixture.pdf',
          bytes: Buffer.from('%PDF-1.7\nSynthetic fixture only'),
        },
      ],
    },
  };
}

it('native SMTP delivers multi-recipient MIME to an isolated loopback server, with Bcc only in the envelope', async () => {
  const fixture = await smtpFixture();
  try {
    const { instance, input } = service(fixture.transport);
    const receipt = await instance.send(input);
    expect(receipt.providerMessageId).toBe(
      '<' + input.clientRequestId + '@example.com>',
    );
    expect(fixture.captured).toHaveLength(1);
    expect(fixture.captured[0].recipients.sort()).toEqual([
      'cc@example.com',
      'hidden@example.com',
      'to@example.com',
    ]);
    const parsed = await PostalMime.parse(fixture.captured[0].raw);
    expect(parsed.bcc).toBeUndefined();
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.attachments[0].filename).toBe('fixture.pdf');
    expect(parsed.html).not.toMatch(/img|tracker/);
    expect(parsed.to?.[0].address).toBe('to@example.com');
    expect(parsed.cc?.[0].address).toBe('cc@example.com');
  } finally {
    await fixture.close();
  }
});

it('a connection lost after SMTP DATA stays unconfirmed with a single native send attempt', async () => {
  const fixture = await smtpFixture(true);
  try {
    const { instance, input } = service(fixture.transport);
    await expect(instance.send(input)).rejects.toThrow(
      'SEND_OUTCOME_UNCONFIRMED',
    );
    expect(fixture.captured).toHaveLength(1);
  } finally {
    await fixture.close();
  }
});
