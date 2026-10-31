import {
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { parseEmailAddressList } from 'kovaa-lab-shared/utils';

import {
  type AwsSesDriverConfig,
  type ResendDriverConfig,
} from 'src/engine/core-modules/emailing-domain/drivers/interfaces/driver-config.interface';
import {
  type EmailingDomainDriverInterface,
  type EmailingDomainResourceInput,
  type EmailingDomainVerificationResult,
} from 'src/engine/core-modules/emailing-domain/drivers/interfaces/emailing-domain-driver.interface';
import {
  EmailingDomainDriverException,
  EmailingDomainDriverExceptionCode,
} from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import { type EmailingDomainSendEmailRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-input.type';
import { type EmailingDomainSendEmailResult } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-result.type';
import { type EmailingDomainSendEmailBatchRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-batch-request.type';
import { type EmailingDomainSendEmailBatchResult } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-batch-result.type';

import { AwsSesClientProvider } from 'src/engine/core-modules/emailing-domain/drivers/aws-ses/providers/aws-ses-client.provider';
import { AwsSesAccountService } from 'src/engine/core-modules/emailing-domain/drivers/aws-ses/services/aws-ses-account.service';
import { AwsSesRegisterDomainService } from 'src/engine/core-modules/emailing-domain/drivers/aws-ses/services/aws-ses-register-domain.service';
import { AwsSesDriver } from 'src/engine/core-modules/emailing-domain/drivers/aws-ses/services/aws-ses-driver.service';
import { AwsSesHandleErrorService } from 'src/engine/core-modules/emailing-domain/drivers/aws-ses/services/aws-ses-handle-error.service';
import { AwsSesSendEmailService } from 'src/engine/core-modules/emailing-domain/drivers/aws-ses/services/aws-ses-send-email.service';
import { LogEmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/log/services/log-emailing-domain-driver.service';
import { ResendApiClientService } from 'src/engine/core-modules/emailing-domain/drivers/resend/services/resend-api-client.service';
import { ResendDriver } from 'src/engine/core-modules/emailing-domain/drivers/resend/services/resend-driver.service';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { SmtpEmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/smtp/smtp-emailing-domain-driver';
import { EmailGroupAccessService } from 'src/engine/core-modules/emailing-domain/services/email-group-access.service';
import { UnsubscribeContentService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-content.service';
import { DriverFactoryBase } from 'src/engine/core-modules/twenty-config/dynamic-factory.base';
import { ConfigVariablesGroup } from 'src/engine/core-modules/twenty-config/enums/config-variables-group.enum';
import { ConfigGroupHashService } from 'src/engine/core-modules/twenty-config/services/config-group-hash.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

// Structural view of the one thing the connection centre publishes to senders:
// a resolved connection carrying the mailbox identity, its exact address, the
// current revision and the workspace it is scoped to. Declared here, like
// HermesMailService does, so campaign sending reads the centre without
// importing it and without moving any module wiring.
export type EmailingDomainMailConnectionReader = {
  resolve(
    workspaceId: string,
    kind: 'MAIL',
  ): Promise<null | {
    workspaceId: string;
    connectionId: string;
    revision: number;
    settings: { connectedAccountId: string; mailbox: string; handle: string };
  }>;
};

const normalizeAddress = (value: unknown): string | null =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= 320 &&
  !/[\r\n\x00<>]/.test(value)
    ? value.trim().toLowerCase()
    : null;

// Campaign sending used to accept any address on the verified domain, with the
// transport taken from EMAILING_SMTP_CONNECTIONS alone: a mailbox registered in
// the connection centre governed nothing. This gate makes the registered
// mailbox the sending authority. It decides *whether* the handoff happens and
// *under which address*; the send engine behind it is untouched.
export class CentralMailboxAuthorizedSmtpDriver implements EmailingDomainDriverInterface {
  constructor(
    private readonly delegate: SmtpEmailingDomainDriver,
    private readonly connections: EmailingDomainMailConnectionReader,
  ) {}

  async sendEmail(
    input: EmailingDomainSendEmailRequest,
  ): Promise<EmailingDomainSendEmailResult> {
    await this.assertRegisteredMailboxAuthorizes(input.workspaceId, input.from);

    return this.delegate.sendEmail(input);
  }

  async sendEmailBatch(
    input: EmailingDomainSendEmailBatchRequest,
  ): Promise<EmailingDomainSendEmailBatchResult> {
    await this.assertRegisteredMailboxAuthorizes(input.workspaceId, input.from);

    return this.delegate.sendEmailBatch(input);
  }

  provisionWorkspace(workspaceId: string): Promise<void> {
    return this.delegate.provisionWorkspace(workspaceId);
  }

  deprovisionWorkspace(workspaceId: string): Promise<void> {
    return this.delegate.deprovisionWorkspace(workspaceId);
  }

  registerDomain(input: EmailingDomainResourceInput): Promise<void> {
    return this.delegate.registerDomain(input);
  }

  cleanupDomain(input: EmailingDomainResourceInput): Promise<void> {
    return this.delegate.cleanupDomain(input);
  }

  verifyDomain(
    input: EmailingDomainResourceInput,
  ): Promise<EmailingDomainVerificationResult> {
    return this.delegate.verifyDomain(input);
  }

  getDomainStatus(
    input: EmailingDomainResourceInput,
  ): Promise<EmailingDomainVerificationResult> {
    return this.delegate.getDomainStatus(input);
  }

  close(): void {
    this.delegate.close();
  }

  // Resolved at the moment of sending, never captured earlier: the centre
  // re-reads the row and refuses on a revision that moved under us.
  private async assertRegisteredMailboxAuthorizes(
    workspaceId: string,
    from: string,
  ): Promise<void> {
    let resolved: Awaited<
      ReturnType<EmailingDomainMailConnectionReader['resolve']>
    >;

    try {
      resolved = await this.connections.resolve(workspaceId, 'MAIL');
    } catch (error) {
      // Closed by default. A revoked, rotated or undecryptable connection is a
      // refusal, never a reason to fall back to EMAILING_SMTP_CONNECTIONS.
      throw this.refuse(
        error instanceof ConflictException
          ? 'the registered mail connection changed revision during this send'
          : 'the registered mail connection could not be read',
      );
    }

    if (!resolved) {
      throw this.refuse(
        'no mail connection is registered for this workspace in the connection centre',
      );
    }

    if (resolved.workspaceId !== workspaceId) {
      throw this.refuse(
        'the resolved mail connection is scoped to another workspace',
      );
    }

    const authorized = normalizeAddress(resolved.settings.handle);

    if (!authorized) {
      throw this.refuse(
        'the registered mail connection publishes no usable mailbox address',
      );
    }

    const parsed = parseEmailAddressList(from);
    const sender =
      parsed.length === 1 ? normalizeAddress(parsed[0]?.address) : null;

    // Sharing the verified domain carries no authority: only the registered
    // mailbox's exact address may send.
    if (sender !== authorized) {
      throw this.refuse(
        `sender ${sender ?? 'address'} is not the registered mailbox ${authorized}`,
      );
    }
  }

  private refuse(reason: string): EmailingDomainDriverException {
    return new EmailingDomainDriverException(
      `Campaign sending refused: ${reason}`,
      EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
    );
  }
}

@Injectable()
export class EmailingDomainDriverFactory extends DriverFactoryBase<EmailingDomainDriverInterface> {
  constructor(
    kovaaLabConfigService: KovaaLabCRMConfigService,
    configGroupHashService: ConfigGroupHashService,
    private readonly awsSesClientProvider: AwsSesClientProvider,
    private readonly awsSesAccountService: AwsSesAccountService,
    private readonly awsSesHandleErrorService: AwsSesHandleErrorService,
    private readonly awsSesRegisterDomainService: AwsSesRegisterDomainService,
    private readonly awsSesSendEmailService: AwsSesSendEmailService,
    private readonly logEmailingDomainDriver: LogEmailingDomainDriver,
    private readonly resendApiClientService: ResendApiClientService,
    private readonly unsubscribeContentService: UnsubscribeContentService,
    private readonly emailGroupAccessService: EmailGroupAccessService,
    // Published by the @Global() HermesConnectionsModule, so nothing in this
    // module's imports moves. Optional only so a deployment that has not
    // installed the connection centre at all keeps booting.
    @Optional()
    @Inject('HERMES_CONNECTIONS_SERVICE')
    private readonly mailConnections?: EmailingDomainMailConnectionReader,
  ) {
    super(kovaaLabConfigService, configGroupHashService);
  }

  override getCurrentDriver(): EmailingDomainDriverInterface {
    this.emailGroupAccessService.validateEmailGroupAccessOrThrow();

    return super.getCurrentDriver();
  }

  protected buildConfigKey(): string {
    const driver = this.kovaaLabConfigService.get('EMAILING_DOMAIN_DRIVER');

    switch (driver) {
      case EmailingDomainDriver.AWS_SES: {
        const awsConfigHash = this.configGroupHashService.computeHash(
          ConfigVariablesGroup.AWS_SES_SETTINGS,
        );

        return `aws-ses|${awsConfigHash}`;
      }
      case EmailingDomainDriver.RESEND: {
        const resendConfigHash = this.configGroupHashService.computeHash(
          ConfigVariablesGroup.RESEND_SETTINGS,
        );

        return `resend|${resendConfigHash}`;
      }
      case EmailingDomainDriver.LOG:
        return 'log';
      case EmailingDomainDriver.SMTP:
        return `smtp|${this.configGroupHashService.computeHash(ConfigVariablesGroup.EMAIL_SETTINGS)}|${this.kovaaLabConfigService.get('SERVER_URL')}`;
      default:
        throw new Error(`Unsupported emailing domain driver: ${driver}`);
    }
  }

  protected createDriver(): EmailingDomainDriverInterface {
    const driver = this.kovaaLabConfigService.get('EMAILING_DOMAIN_DRIVER');

    switch (driver) {
      case EmailingDomainDriver.AWS_SES: {
        const region = this.kovaaLabConfigService.get('AWS_SES_REGION');
        const accountId = this.kovaaLabConfigService.get('AWS_SES_ACCOUNT_ID');
        const accessKeyId = this.kovaaLabConfigService.get(
          'AWS_SES_ACCESS_KEY_ID',
        );
        const secretAccessKey = this.kovaaLabConfigService.get(
          'AWS_SES_SECRET_ACCESS_KEY',
        );
        const sessionToken = this.kovaaLabConfigService.get(
          'AWS_SES_SESSION_TOKEN',
        );

        const awsConfig: AwsSesDriverConfig = {
          driver: EmailingDomainDriver.AWS_SES,
          region,
          accountId,
          accessKeyId,
          secretAccessKey,
          sessionToken,
        };

        return new AwsSesDriver(
          awsConfig,
          this.awsSesClientProvider,
          this.awsSesAccountService,
          this.awsSesHandleErrorService,
          this.awsSesRegisterDomainService,
          this.awsSesSendEmailService,
          this.unsubscribeContentService,
        );
      }

      case EmailingDomainDriver.RESEND: {
        const domainRegion = this.kovaaLabConfigService.get(
          'RESEND_DOMAIN_REGION',
        );

        const resendConfig: ResendDriverConfig = {
          driver: EmailingDomainDriver.RESEND,
          ...(isNonEmptyString(domainRegion) ? { domainRegion } : {}),
        };

        return new ResendDriver(
          resendConfig,
          this.resendApiClientService,
          this.unsubscribeContentService,
        );
      }

      case EmailingDomainDriver.LOG:
        return this.logEmailingDomainDriver;

      case EmailingDomainDriver.SMTP: {
        const smtpDriver = new SmtpEmailingDomainDriver(
          this.kovaaLabConfigService.get('EMAILING_SMTP_CONNECTIONS'),
          this.kovaaLabConfigService.get('SERVER_URL'),
          this.unsubscribeContentService,
        );

        // With the connection centre installed, the registered mailbox is the
        // only sending authority and there is no environment fallback. Without
        // it, the pre-existing EMAILING_SMTP_CONNECTIONS behaviour stands.
        return this.mailConnections
          ? new CentralMailboxAuthorizedSmtpDriver(
              smtpDriver,
              this.mailConnections,
            )
          : smtpDriver;
      }

      default:
        throw new Error(`Invalid emailing domain driver: ${driver}`);
    }
  }

  protected disposeDriver(driver: EmailingDomainDriverInterface): void {
    if (
      driver instanceof SmtpEmailingDomainDriver ||
      driver instanceof CentralMailboxAuthorizedSmtpDriver
    )
      driver.close();
  }
}
