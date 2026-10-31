import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

import { EmailingDomainDriverFactory } from 'src/engine/core-modules/emailing-domain/drivers/emailing-domain-driver.factory';
import { EmailingDomainDriverExceptionCode } from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import {
  EmailingDomainMailboxTransportProvider,
  type EmailingDomainMailConnectionReader,
} from 'src/engine/core-modules/emailing-domain/drivers/smtp/providers/emailing-domain-mailbox-transport.provider';
import { SmtpEmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/smtp/smtp-emailing-domain-driver';
import { type EmailingDomainSendEmailBatchRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-batch-request.type';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { type EmailingDomainSendEmailRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-input.type';
import { type EmailGroupAccessService } from 'src/engine/core-modules/emailing-domain/services/email-group-access.service';
import { UnsubscribeContentService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-content.service';
import { type UnsubscribeTokenService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service';
import { type ConfigGroupHashService } from 'src/engine/core-modules/twenty-config/services/config-group-hash.service';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type SmtpClientProvider } from 'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider';

jest.mock(
  'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service',
  () => ({ UnsubscribeTokenService: class {} }),
);

const WORKSPACE_ID = '0cd3fa15-c8df-4e88-9660-d559a464d395';
const OTHER_WORKSPACE_ID = '29d1892b-d56e-47c5-a80b-484f028cce2d';
const CONNECTED_ACCOUNT_ID = '5dc7bb42-3f26-4a5e-8a2f-9a3d43f1be41';
const CONNECTION_ID = 'ab20da84-6bf1-4f71-9f0e-5a5e1f1b2f7f';
const DOMAIN = 'sender.example.test';
const REGISTERED_MAILBOX = `operator@${DOMAIN}`;

// The operator's environment relay is deliberately present and valid for this
// workspace and sender domain throughout. It must never become the transport,
// and a refusal with it configured proves it is no longer an authority either.
const ENVIRONMENT_CONNECTIONS = JSON.stringify({
  [WORKSPACE_ID]: {
    host: '127.0.0.1',
    port: 2525,
    security: 'plaintext-loopback',
    senderDomains: [DOMAIN],
  },
});

const resolvedConnection = (
  overrides: Partial<{
    workspaceId: string;
    revision: number;
    handle: string;
  }> = {},
) => ({
  workspaceId: overrides.workspaceId ?? WORKSPACE_ID,
  connectionId: CONNECTION_ID,
  revision: overrides.revision ?? 4,
  settings: {
    connectedAccountId: CONNECTED_ACCOUNT_ID,
    mailbox: 'INBOX',
    handle: overrides.handle ?? REGISTERED_MAILBOX,
  },
});

const sendRequest = (from: string) =>
  ({
    workspaceId: WORKSPACE_ID,
    domain: DOMAIN,
    emailingDomain: { workspaceId: WORKSPACE_ID, domain: DOMAIN },
    sendKind: 'TRANSACTIONAL',
    from,
    to: ['prospect@example.test'],
    subject: 'Campaign',
    text: 'Body',
  }) as unknown as EmailingDomainSendEmailRequest;

const batchRequest = (from: string) =>
  ({
    workspaceId: WORKSPACE_ID,
    domain: DOMAIN,
    emailingDomain: { workspaceId: WORKSPACE_ID, domain: DOMAIN },
    sendKind: 'TRANSACTIONAL',
    from,
    template: { subject: 'Campaign', text: 'Body' },
    recipients: [{ email: 'prospect@example.test', replacements: {} }],
  }) as unknown as EmailingDomainSendEmailBatchRequest;

describe('campaigns leave through the mailbox registered in the connection centre', () => {
  // Nothing is ever delivered: the nodemailer transport is a double, so these
  // tests prove which account the message is handed to, and which sends refuse.
  let sendMail: jest.Mock;
  let getClient: jest.Mock;
  let transportClose: jest.Mock;

  const unsubscribe = new UnsubscribeContentService({
    sign: ({ emailAddress }: { emailAddress: string }) =>
      Buffer.from(emailAddress).toString('base64url'),
  } as unknown as UnsubscribeTokenService);

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({
      messageId: '<stub@sender.example.test>',
      accepted: ['prospect@example.test'],
    });
    transportClose = jest.fn();
    getClient = jest.fn().mockResolvedValue({
      sendMail,
      close: transportClose,
      verify: jest.fn().mockResolvedValue(true),
    });
  });

  const smtpClient = () => ({ getClient }) as unknown as SmtpClientProvider;

  const buildFactory = (
    reader: EmailingDomainMailConnectionReader | undefined,
  ): EmailingDomainDriverFactory => {
    const config = {
      get: (key: string) => {
        if (key === 'EMAILING_DOMAIN_DRIVER') return EmailingDomainDriver.SMTP;
        if (key === 'EMAILING_SMTP_CONNECTIONS') return ENVIRONMENT_CONNECTIONS;
        if (key === 'SERVER_URL') return 'https://crm.example.test/';

        return undefined;
      },
    } as unknown as KovaaLabCRMConfigService;

    // The SMTP branch under test constructs none of the provider-specific
    // services, so they stay absent rather than being faked.
    const unused = undefined as never;

    return new EmailingDomainDriverFactory(
      config,
      { computeHash: () => 'hash' } as unknown as ConfigGroupHashService,
      unused, // AwsSesClientProvider
      unused, // AwsSesAccountService
      unused, // AwsSesHandleErrorService
      unused, // AwsSesRegisterDomainService
      unused, // AwsSesSendEmailService
      unused, // LogEmailingDomainDriver
      unused, // ResendApiClientService
      unsubscribe,
      {
        validateEmailGroupAccessOrThrow: () => undefined,
      } as unknown as EmailGroupAccessService,
      new EmailingDomainMailboxTransportProvider(smtpClient(), reader),
    );
  };

  const driverWith = (
    resolve: EmailingDomainMailConnectionReader['resolve'] = async () =>
      resolvedConnection(),
  ) => buildFactory({ resolve: jest.fn(resolve) }).getCurrentDriver();

  it('hands the message to the registered mailbox account, not the environment relay', async () => {
    const driver = driverWith();

    await driver.sendEmailBatch(
      batchRequest(`Operator <${REGISTERED_MAILBOX}>`),
    );

    expect(getClient).toHaveBeenCalledWith(CONNECTED_ACCOUNT_ID, {
      timeoutMs: 30_000,
    });
    expect(
      getClient.mock.calls.every(
        ([accountId]) => accountId === CONNECTED_ACCOUNT_ID,
      ),
    ).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].from).toBe(
      `Operator <${REGISTERED_MAILBOX}>`,
    );
  });

  it('sends through the registered mailbox on the single-message path too', async () => {
    const driver = driverWith();

    await driver.sendEmail(sendRequest(REGISTERED_MAILBOX));

    expect(getClient).toHaveBeenCalledWith(CONNECTED_ACCOUNT_ID, {
      timeoutMs: 30_000,
    });
    expect(sendMail.mock.calls[0][0].from).toBe(REGISTERED_MAILBOX);
  });

  it('resolves the connection centre for the sending workspace at the moment of sending', async () => {
    const resolve = jest.fn(async () => resolvedConnection());

    await buildFactory({ resolve })
      .getCurrentDriver()
      .sendEmail(sendRequest(REGISTERED_MAILBOX));

    expect(resolve).toHaveBeenCalledWith(WORKSPACE_ID, 'MAIL');
  });

  it('reopens the account and retires the old transport when the revision rotates', async () => {
    let revision = 4;
    const driver = driverWith(async () => resolvedConnection({ revision }));

    await driver.sendEmail(sendRequest(REGISTERED_MAILBOX));
    await driver.sendEmail(sendRequest(REGISTERED_MAILBOX));
    expect(getClient).toHaveBeenCalledTimes(1);

    revision = 5;
    await driver.sendEmail(sendRequest(REGISTERED_MAILBOX));

    expect(getClient).toHaveBeenCalledTimes(2);
    expect(transportClose).toHaveBeenCalled();
  });

  // Opening an account is the slow part, so it is the window in which a
  // rotation or a revocation can land. Each case below lands it mid-open.
  describe('a connection that changes while its mailbox is being opened', () => {
    const openingLands = (duringOpen: () => void) => {
      getClient = jest.fn().mockImplementation(async () => {
        duringOpen();

        return {
          sendMail,
          close: transportClose,
          verify: jest.fn().mockResolvedValue(true),
        };
      });
    };

    it('refuses and closes the stale transport when the revision rotates mid-open', async () => {
      let revision = 4;

      openingLands(() => {
        revision = 5;
      });

      const driver = driverWith(async () => resolvedConnection({ revision }));

      await expect(
        driver.sendEmail(sendRequest(REGISTERED_MAILBOX)),
      ).rejects.toMatchObject({
        code: EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
        message: expect.stringContaining(
          'changed while its mailbox was being opened',
        ),
      });
      expect(sendMail).not.toHaveBeenCalled();
      expect(transportClose).toHaveBeenCalledTimes(1);
    });

    it('refuses and closes the stale transport when the connection is revoked mid-open', async () => {
      let revoked = false;

      openingLands(() => {
        revoked = true;
      });

      const driver = driverWith(async () =>
        revoked ? null : resolvedConnection(),
      );

      await expect(
        driver.sendEmail(sendRequest(REGISTERED_MAILBOX)),
      ).rejects.toMatchObject({
        code: EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
        message: expect.stringContaining('no mail connection is registered'),
      });
      expect(sendMail).not.toHaveBeenCalled();
      expect(transportClose).toHaveBeenCalledTimes(1);
    });

    it('refuses the whole batch and closes the stale transport on a mid-open revocation', async () => {
      let revoked = false;

      openingLands(() => {
        revoked = true;
      });

      const driver = driverWith(async () =>
        revoked ? null : resolvedConnection(),
      );

      await expect(
        driver.sendEmailBatch(batchRequest(REGISTERED_MAILBOX)),
      ).rejects.toMatchObject({
        code: EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
      });
      expect(sendMail).not.toHaveBeenCalled();
      expect(transportClose).toHaveBeenCalledTimes(1);
    });
  });

  describe.each([
    [
      'no connection is registered',
      async () => null,
      'no mail connection is registered',
    ],
    [
      'the connection was revoked or cannot be read',
      async () => {
        throw new ServiceUnavailableException(
          'CONNECTION_CONFIGURATION_UNAVAILABLE',
        );
      },
      'could not be read',
    ],
    [
      'the revision went stale under the send',
      async () => {
        throw new ConflictException('CONNECTION_REVISION_CONFLICT');
      },
      'changed revision',
    ],
    [
      'the resolved connection belongs to another workspace',
      async () => resolvedConnection({ workspaceId: OTHER_WORKSPACE_ID }),
      'scoped to another workspace',
    ],
    [
      'the sender only shares the verified domain',
      async () => resolvedConnection({ handle: `someone-else@${DOMAIN}` }),
      'is not the registered mailbox',
    ],
  ])(
    'refuses the send and never falls back to the environment relay when %s',
    (_case, resolve, expectedReason) => {
      it('refuses sendEmailBatch', async () => {
        const driver = driverWith(
          resolve as EmailingDomainMailConnectionReader['resolve'],
        );

        await expect(
          driver.sendEmailBatch(batchRequest(REGISTERED_MAILBOX)),
        ).rejects.toMatchObject({
          code: EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
          message: expect.stringContaining(expectedReason),
        });
        expect(getClient).not.toHaveBeenCalled();
        expect(sendMail).not.toHaveBeenCalled();
      });

      it('refuses sendEmail', async () => {
        const driver = driverWith(
          resolve as EmailingDomainMailConnectionReader['resolve'],
        );

        await expect(
          driver.sendEmail(sendRequest(REGISTERED_MAILBOX)),
        ).rejects.toMatchObject({
          code: EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
        });
        expect(getClient).not.toHaveBeenCalled();
        expect(sendMail).not.toHaveBeenCalled();
      });
    },
  );

  it('engages the registered-mailbox path only when the connection centre is installed', async () => {
    const provider = new EmailingDomainMailboxTransportProvider(
      smtpClient(),
      undefined,
    );

    expect(provider.isConnectionCentreInstalled).toBe(false);
    await expect(provider.authorize(WORKSPACE_ID, null)).rejects.toMatchObject({
      code: EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
      message: expect.stringContaining('connection centre is not installed'),
    });
  });

  it('keeps the existing SMTP driver in the send path, with no new engine', () => {
    expect(driverWith()).toBeInstanceOf(SmtpEmailingDomainDriver);
  });
});
