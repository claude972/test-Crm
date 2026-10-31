import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

import {
  CentralMailboxAuthorizedSmtpDriver,
  EmailingDomainDriverFactory,
  type EmailingDomainMailConnectionReader,
} from 'src/engine/core-modules/emailing-domain/drivers/emailing-domain-driver.factory';
import { EmailingDomainDriverExceptionCode } from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import { SmtpEmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/smtp/smtp-emailing-domain-driver';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { type EmailingDomainSendEmailBatchRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-batch-request.type';
import { type EmailingDomainSendEmailRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-input.type';
import { type EmailGroupAccessService } from 'src/engine/core-modules/emailing-domain/services/email-group-access.service';
import { type UnsubscribeContentService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-content.service';
import { type ConfigGroupHashService } from 'src/engine/core-modules/twenty-config/services/config-group-hash.service';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const WORKSPACE_ID = '0cd3fa15-c8df-4e88-9660-d559a464d395';
const OTHER_WORKSPACE_ID = '29d1892b-d56e-47c5-a80b-484f028cce2d';
const DOMAIN = 'sender.example.test';
const REGISTERED_MAILBOX = `operator@${DOMAIN}`;

// The operator's environment relay is deliberately present and valid for this
// workspace and sender domain in every case below. A refusal therefore proves
// the environment variable is no longer an authority on its own.
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
    connectionId: string;
    revision: number;
    handle: string;
  }> = {},
) => ({
  workspaceId: overrides.workspaceId ?? WORKSPACE_ID,
  connectionId:
    overrides.connectionId ?? 'ab20da84-6bf1-4f71-9f0e-5a5e1f1b2f7f',
  revision: overrides.revision ?? 4,
  settings: {
    connectedAccountId: '5dc7bb42-3f26-4a5e-8a2f-9a3d43f1be41',
    mailbox: 'INBOX',
    handle: overrides.handle ?? REGISTERED_MAILBOX,
  },
});

const buildFactory = (
  mailConnections?: EmailingDomainMailConnectionReader,
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
    {} as UnsubscribeContentService,
    {
      validateEmailGroupAccessOrThrow: () => undefined,
    } as unknown as EmailGroupAccessService,
    mailConnections,
  );
};

const sendRequest = (from: string) =>
  ({
    workspaceId: WORKSPACE_ID,
    domain: DOMAIN,
    emailingDomain: { workspaceId: WORKSPACE_ID, domain: DOMAIN },
    sendKind: 'MARKETING',
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
    sendKind: 'MARKETING',
    from,
    template: { subject: 'Campaign', text: 'Body' },
    recipients: [{ email: 'prospect@example.test', replacements: {} }],
  }) as unknown as EmailingDomainSendEmailBatchRequest;

describe('campaign sending is bound to the mailbox registered in the connection centre', () => {
  // No real transport is ever opened: the send engine is stubbed at its
  // boundary so these tests prove routing and refusal, never delivery.
  let sendEmail: jest.SpyInstance;
  let sendEmailBatch: jest.SpyInstance;

  beforeEach(() => {
    sendEmail = jest
      .spyOn(SmtpEmailingDomainDriver.prototype, 'sendEmail')
      .mockResolvedValue({
        messageId: 'stub',
        headerMessageId: 'stub',
        deliveredRecipients: { to: [], cc: [], bcc: [] },
      });
    sendEmailBatch = jest
      .spyOn(SmtpEmailingDomainDriver.prototype, 'sendEmailBatch')
      .mockResolvedValue({ entries: [] });
  });

  const reader = (
    resolve: EmailingDomainMailConnectionReader['resolve'],
  ): EmailingDomainMailConnectionReader => ({ resolve: jest.fn(resolve) });

  const driverWith = (resolve: EmailingDomainMailConnectionReader['resolve']) =>
    buildFactory(reader(resolve)).getCurrentDriver();

  it('wraps the SMTP driver in the central-mailbox gate when the connection centre is installed', () => {
    expect(driverWith(async () => resolvedConnection())).toBeInstanceOf(
      CentralMailboxAuthorizedSmtpDriver,
    );
  });

  it('sends through the registered mailbox when the from address is its exact address', async () => {
    const driver = driverWith(async () => resolvedConnection());

    await driver.sendEmailBatch(
      batchRequest(`Operator <${REGISTERED_MAILBOX}>`),
    );
    await driver.sendEmail(sendRequest(REGISTERED_MAILBOX));

    expect(sendEmailBatch).toHaveBeenCalledTimes(1);
    expect(sendEmailBatch.mock.calls[0][0].from).toBe(
      `Operator <${REGISTERED_MAILBOX}>`,
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].from).toBe(REGISTERED_MAILBOX);
  });

  it('asks the connection centre for the sending workspace at the moment of sending', async () => {
    const resolve = jest.fn(async () => resolvedConnection());

    await buildFactory({ resolve })
      .getCurrentDriver()
      .sendEmailBatch(batchRequest(REGISTERED_MAILBOX));

    expect(resolve).toHaveBeenCalledWith(WORKSPACE_ID, 'MAIL');
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
    'refuses the send and never falls back to the environment when %s',
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
        expect(sendEmailBatch).not.toHaveBeenCalled();
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
        expect(sendEmail).not.toHaveBeenCalled();
      });
    },
  );

  it('keeps the pre-existing environment behaviour only when no connection centre is installed at all', () => {
    const driver = buildFactory(undefined).getCurrentDriver();

    expect(driver).toBeInstanceOf(SmtpEmailingDomainDriver);
    expect(driver).not.toBeInstanceOf(CentralMailboxAuthorizedSmtpDriver);
  });
});
