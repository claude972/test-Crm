import { ImapFlow } from 'imapflow';
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';

// ISOLATED MAIL SERVER FIXTURE for the campaign mailbox journey. It is a
// demonstration capture server, never a verified real connector: it accepts
// submissions and stores them, and delivers to nobody outside itself.
//
// It differs from start-greenmail-container.util.ts deliberately. That util
// exposes GreenMail's PLAINTEXT ports, and the connection centre refuses a
// plaintext account: HermesConnectionsService.mailbox() requires SSL_TLS or
// STARTTLS on BOTH IMAP and SMTP before it will register a MAIL connection.
// So this fixture exposes the TLS ports instead, which lets the journey satisfy
// that guard honestly rather than by weakening it. GreenMail presents a
// self-signed certificate, so the run also needs IMAP_SMTP_ALLOW_SELF_SIGNED.
const GREENMAIL_IMAGE =
  'greenmail/standalone:2.1.9@sha256:3ac5a83dd6727cf95e4d50e18907fb8ee7bbf5f67e8534714dee2fb1b5b2e1d4';
const GREENMAIL_IMAPS_PORT = 3993;
const GREENMAIL_SMTPS_PORT = 3465;

export type CampaignMailboxServer = {
  host: string;
  imapsPort: number;
  smtpsPort: number;
  stop: () => Promise<void>;
};

export const startCampaignMailboxContainer = async ({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<CampaignMailboxServer> => {
  const [localPart, domain] = username.split('@');

  // The mailbox is declared up front: saving the account authenticates against
  // IMAP immediately, before any mail exists to create the user implicitly.
  const container: StartedTestContainer = await new GenericContainer(
    GREENMAIL_IMAGE,
  )
    .withEnvironment({
      GREENMAIL_OPTS: [
        '-Dgreenmail.setup.test.imaps',
        '-Dgreenmail.setup.test.smtps',
        '-Dgreenmail.hostname=0.0.0.0',
        `-Dgreenmail.users=${localPart}:${password}@${domain}`,
      ].join(' '),
    })
    .withExposedPorts(GREENMAIL_IMAPS_PORT, GREENMAIL_SMTPS_PORT)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  return {
    host: container.getHost(),
    imapsPort: container.getMappedPort(GREENMAIL_IMAPS_PORT),
    smtpsPort: container.getMappedPort(GREENMAIL_SMTPS_PORT),
    stop: async () => {
      await container.stop();
    },
  };
};

export type CapturedMessage = {
  subject: string;
  from: string;
  to: string;
  source: string;
};

// Reads what the fixture actually captured. The subject and recipient are read
// from the stored message, so a test asserts on the delivered bytes rather than
// on the API's own report of what it sent.
export const readCapturedMessages = async ({
  host,
  port,
  username,
  password,
}: {
  host: string;
  port: number;
  username: string;
  password: string;
}): Promise<CapturedMessage[]> => {
  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user: username, pass: password },
    logger: false,
    // The fixture's certificate is self-signed by design.
    tls: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock('INBOX');

    try {
      const captured: CapturedMessage[] = [];

      for await (const message of client.fetch(
        { all: true },
        { envelope: true, source: true },
      )) {
        captured.push({
          subject: message.envelope?.subject ?? '',
          from: message.envelope?.from?.[0]?.address ?? '',
          to: message.envelope?.to?.[0]?.address ?? '',
          source: message.source?.toString('utf8') ?? '',
        });
      }

      return captured;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
};
