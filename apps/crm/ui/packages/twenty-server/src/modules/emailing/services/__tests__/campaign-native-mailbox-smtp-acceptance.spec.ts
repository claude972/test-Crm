import { createServer, type Server, type Socket } from 'node:net';

import { createTransport } from 'nodemailer';

import { EmailingDomainDriverExceptionCode } from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import { SmtpEmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/smtp/smtp-emailing-domain-driver';
import { EmailingDomainMailboxTransportProvider } from 'src/engine/core-modules/emailing-domain/drivers/smtp/providers/emailing-domain-mailbox-transport.provider';
import { UnsubscribeContentService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-content.service';
import { type UnsubscribeTokenService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service';
import { EmailingDomainSenderService } from 'src/modules/emailing/services/emailing-domain-sender.service';

jest.mock(
  'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service',
  () => ({ UnsubscribeTokenService: class {} }),
);
jest.mock(
  'src/engine/core-modules/emailing-domain/drivers/emailing-domain-driver.factory',
  () => ({ EmailingDomainDriverFactory: class {} }),
);
jest.mock(
  'src/engine/core-modules/emailing-domain/emailing-domain.entity',
  () => ({ EmailingDomainEntity: class {} }),
);
jest.mock(
  'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository',
  () => ({ WorkspaceScopedRepository: class {} }),
);
jest.mock('src/modules/emailing/services/message-suppression.service', () => ({
  MessageSuppressionService: class {},
}));
jest.mock(
  'src/engine/metadata-modules/message-channel/entities/message-channel.entity',
  () => ({ MessageChannelEntity: class {} }),
);
jest.mock(
  'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider',
  () => ({ SmtpClientProvider: class {} }),
);

const WORKSPACE_ID = '0cd3fa15-c8df-4e88-9660-d559a464d395';
const EMAILING_DOMAIN_ID = '7c1a4a2e-5e3e-4a3f-9f44-4e2b6a1d9c01';
const CONNECTED_ACCOUNT_ID = 'e2b9f0a1-7a4c-4f9b-9d2e-55b1c3a7d401';
const CONNECTION_ID = 'b4d2c1a0-9e8f-4c7b-8a6d-3f2e1d0c9b88';

// A provider-managed mailbox: the operator authenticated this address but does
// not control provider.test DNS. Under the SMTP driver that is exactly what
// verifyDomain accepts, by connectivity rather than by DNS records.
const MAILBOX_DOMAIN = 'provider.test';
const MAILBOX_ADDRESS = `operator@${MAILBOX_DOMAIN}`;
const INTRUDER_ADDRESS = `someone-else@${MAILBOX_DOMAIN}`;

jest.setTimeout(30_000);

type RecordedMessage = { recipients: string[]; content: string };

type LoopbackSmtp = {
  server: Server;
  port: number;
  messages: RecordedMessage[];
  setLoseReceipt: (value: boolean) => void;
};

// ISOLATED SMTP PROTOCOL FIXTURE — a loopback socket speaking just enough SMTP
// to capture what was handed to it. It is a demonstration capture server, never
// a verified real connector, and it delivers nothing to anyone.
const startLoopbackSmtp = async (): Promise<LoopbackSmtp> => {
  const messages: RecordedMessage[] = [];
  const sockets = new Set<Socket>();
  let loseReceipt = false;

  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => sockets.delete(socket));
    socket.setEncoding('utf8');
    socket.write('220 fixture.invalid ESMTP\r\n');

    let buffer = '';
    let inData = false;
    let content: string[] = [];
    let recipients: string[] = [];

    socket.on('data', (chunk) => {
      buffer += chunk;

      while (buffer.includes('\r\n')) {
        const boundary = buffer.indexOf('\r\n');
        const line = buffer.slice(0, boundary);

        buffer = buffer.slice(boundary + 2);

        if (inData) {
          if (line === '.') {
            messages.push({
              recipients: [...recipients],
              content: content.join('\r\n'),
            });
            inData = false;
            content = [];
            recipients = [];

            if (loseReceipt) {
              socket.destroy();

              return;
            }

            socket.write('250 fixture accepted, not delivered\r\n');
          } else {
            content.push(line.replace(/^\.\./, '.'));
          }
        } else if (/^(EHLO|HELO) /i.test(line)) {
          socket.write('250-fixture.invalid\r\n250 PIPELINING\r\n');
        } else if (/^MAIL FROM:/i.test(line)) {
          recipients = [];
          socket.write('250 sender accepted\r\n');
        } else if (/^RCPT TO:/i.test(line)) {
          recipients.push(line.match(/<([^>]+)>/)?.[1] ?? '');
          socket.write('250 recipient accepted\r\n');
        } else if (line === 'DATA') {
          inData = true;
          socket.write('354 send synthetic content\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 goodbye\r\n');
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
  });

  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );

  return {
    server,
    port: (server.address() as { port: number }).port,
    messages,
    setLoseReceipt: (value: boolean) => {
      loseReceipt = value;
    },
  };
};

const stopLoopbackSmtp = async (smtp: LoopbackSmtp) =>
  new Promise<void>((resolve) => smtp.server.close(() => resolve()));

// Perimeter: senderService -> mailbox transport provider -> SMTP driver ->
// loopback socket. Real down to captured bytes; the MAIL connection, connected
// account, emailing-domain row and suppressions are doubles. Not HTTP, not
// PostgreSQL, and not an onboarding: it proves the sending chain given a
// registered mailbox, never that a user acquired one through the product.
describe('Campaign send from the natively registered mailbox, captured by an isolated SMTP server', () => {
  let mailbox: LoopbackSmtp;
  let environmentRelay: LoopbackSmtp;
  let senderService: EmailingDomainSenderService;
  let driver: SmtpEmailingDomainDriver;
  let revision: number;
  let resolveError: Error | null;

  const sign = jest.fn(({ emailAddress }: { emailAddress: string }) =>
    Buffer.from(emailAddress).toString('base64url'),
  );

  const content = (overrides = {}) => ({
    sendKind: 'MARKETING' as const,
    from: MAILBOX_ADDRESS,
    to: ['prospect@recipient.invalid'],
    subject: 'Campagne de recette',
    text: 'Contenu de fixture uniquement',
    html: '<p>Contenu de fixture uniquement</p>',
    ...overrides,
  });

  beforeEach(async () => {
    jest.useRealTimers();
    sign.mockClear();
    revision = 1;
    resolveError = null;

    mailbox = await startLoopbackSmtp();
    environmentRelay = await startLoopbackSmtp();

    // ISOLATED FAKE native SMTP client provider. The real one decrypts the
    // connected account's credentials; this one proves only which account id
    // the emailing path asked for, and opens a loopback transport for it.
    const smtpClientProvider = {
      getClient: jest.fn(async (connectedAccountId: string) => {
        if (connectedAccountId !== CONNECTED_ACCOUNT_ID) {
          throw new Error(`unknown connected account ${connectedAccountId}`);
        }

        return createTransport({
          host: '127.0.0.1',
          port: mailbox.port,
          secure: false,
          ignoreTLS: true,
        });
      }),
    };

    // Stands in for the central connection centre's MAIL connection.
    const connections = {
      resolve: jest.fn(async (workspaceId: string, kind: string) => {
        if (resolveError) {
          throw resolveError;
        }

        return kind === 'MAIL' && workspaceId === WORKSPACE_ID
          ? {
              workspaceId: WORKSPACE_ID,
              connectionId: CONNECTION_ID,
              revision,
              settings: {
                connectedAccountId: CONNECTED_ACCOUNT_ID,
                mailbox: MAILBOX_ADDRESS,
                handle: MAILBOX_ADDRESS,
              },
            }
          : null;
      }),
    };

    const mailboxTransportProvider = new EmailingDomainMailboxTransportProvider(
      smtpClientProvider as never,
      connections as never,
    );

    // The environment relay is configured and perfectly valid throughout. If
    // anything leaves through it, the registered mailbox was not the authority.
    driver = new SmtpEmailingDomainDriver(
      JSON.stringify({
        [WORKSPACE_ID]: {
          host: '127.0.0.1',
          port: environmentRelay.port,
          security: 'plaintext-loopback',
          senderDomains: [MAILBOX_DOMAIN],
        },
      }),
      'https://crm.invalid',
      new UnsubscribeContentService({
        sign,
      } as unknown as UnsubscribeTokenService),
      mailboxTransportProvider,
    );

    senderService = new EmailingDomainSenderService(
      {
        findOne: jest.fn(async () => ({
          id: EMAILING_DOMAIN_ID,
          workspaceId: WORKSPACE_ID,
          // VERIFIED here means SMTP connectivity succeeded, not that SPF or
          // DKIM are installed. The driver's own verifyDomain says so.
          domain: MAILBOX_DOMAIN,
          status: 'VERIFIED',
          tenantStatus: 'ACTIVE',
          unsubscribeHostname: 'crm.invalid',
          unsubscribeHostnameStatus: 'ACTIVE',
        })),
      } as never,
      { getDriverForDomain: () => driver } as never,
      {
        findApplicableSuppressions: jest.fn(async () => []),
        findTrackingOptedOutEmailAddresses: jest.fn(async () => new Set()),
      } as never,
      { findOne: jest.fn(async () => null) } as never,
    );
  });

  afterEach(async () => {
    await driver.close();
    await stopLoopbackSmtp(mailbox);
    await stopLoopbackSmtp(environmentRelay);
  });

  it('should capture the campaign in the registered mailbox and never in the environment relay', async () => {
    const result = await senderService.sendEmail(
      WORKSPACE_ID,
      EMAILING_DOMAIN_ID,
      content(),
    );

    expect(result.messageId).toBeDefined();
    expect(mailbox.messages).toHaveLength(1);
    // The whole point: the configured relay is a valid SMTP server and stays
    // untouched, because authority comes from the registered mailbox.
    expect(environmentRelay.messages).toHaveLength(0);

    const [captured] = mailbox.messages;

    expect(captured.recipients).toEqual(['prospect@recipient.invalid']);
    expect(captured.content).toContain(`From: ${MAILBOX_ADDRESS}`);
    expect(captured.content).toContain('Subject: ');
  });

  it('should ask the native client provider for exactly the registered connected account', async () => {
    await senderService.sendEmail(WORKSPACE_ID, EMAILING_DOMAIN_ID, content());

    const [captured] = mailbox.messages;

    // The bytes left through the account the centre published, not through a
    // relay address that merely shares the domain.
    expect(captured.content).toContain(MAILBOX_ADDRESS);
  });

  it('should attach the unsubscribe affordances a marketing campaign requires', async () => {
    await senderService.sendEmail(WORKSPACE_ID, EMAILING_DOMAIN_ID, content());

    const [captured] = mailbox.messages;

    expect(captured.content.toLowerCase()).toContain('list-unsubscribe');
    expect(sign).toHaveBeenCalled();
  });

  it('should refuse a sender that merely shares the verified domain, capturing nothing', async () => {
    await expect(
      senderService.sendEmail(
        WORKSPACE_ID,
        EMAILING_DOMAIN_ID,
        content({ from: INTRUDER_ADDRESS }),
      ),
    ).rejects.toMatchObject({
      code: EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
    });

    expect(mailbox.messages).toHaveLength(0);
    expect(environmentRelay.messages).toHaveLength(0);
  });

  it('should refuse when no mail connection is registered, rather than fall back to the relay', async () => {
    await expect(
      senderService.sendEmail(
        'bdb0f0a6-0c3a-4f8d-9c1e-7a6b5c4d3e2f',
        EMAILING_DOMAIN_ID,
        content(),
      ),
    ).rejects.toMatchObject({
      code: EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
    });

    expect(environmentRelay.messages).toHaveLength(0);
  });

  it('should report an uncertain outcome once, with exactly one message handed over and no retry', async () => {
    mailbox.setLoseReceipt(true);

    await expect(
      senderService.sendEmail(WORKSPACE_ID, EMAILING_DOMAIN_ID, content()),
    ).rejects.toMatchObject({
      code: EmailingDomainDriverExceptionCode.SEND_OUTCOME_UNCONFIRMED,
    });

    // The server did receive the content, so the message may have been
    // delivered. It must therefore be handed over exactly once: the caller is
    // told the outcome is unknown instead of being invited to send again.
    expect(mailbox.messages).toHaveLength(1);
    expect(environmentRelay.messages).toHaveLength(0);
  });
});
