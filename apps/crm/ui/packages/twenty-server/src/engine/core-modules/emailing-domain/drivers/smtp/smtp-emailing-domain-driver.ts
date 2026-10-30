import { createTransport } from 'nodemailer';
import { parseEmailAddressList } from 'kovaa-lab-shared/utils';

import {
  EmailingDomainDriverException,
  EmailingDomainDriverExceptionCode,
} from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import {
  type EmailingDomainDriverInterface,
  type EmailingDomainResourceInput,
  type EmailingDomainVerificationResult,
} from 'src/engine/core-modules/emailing-domain/drivers/interfaces/emailing-domain-driver.interface';
import {
  type HermesSmtpConnection,
  parseSmtpConnections,
} from 'src/engine/core-modules/emailing-domain/drivers/smtp/smtp-connection.schema';
import { type EmailingDomainSendEmailRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-input.type';
import { type EmailingDomainSendEmailResult } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-result.type';
import { type EmailingDomainSendEmailBatchRequest } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-batch-request.type';
import { type EmailingDomainSendEmailBatchResult } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-batch-result.type';
import { EmailingDomainStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-status.type';
import { applyReplacementTags } from 'src/engine/core-modules/emailing-domain/utils/apply-replacement-tags.util';
import { type UnsubscribeContentService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-content.service';

type SmtpTransport = ReturnType<typeof createTransport>;

export class SmtpEmailingDomainDriver implements EmailingDomainDriverInterface {
  private readonly connections: Record<string, HermesSmtpConnection>;
  private readonly transports = new Map<string, SmtpTransport>();
  private readonly unsubscribeBaseUrl: string;

  constructor(
    serializedConnections: string,
    serverUrl: string,
    private readonly unsubscribeContentService: UnsubscribeContentService,
  ) {
    try {
      this.connections = parseSmtpConnections(serializedConnections);
      const origin = new URL(serverUrl);

      if (
        origin.protocol !== 'https:' ||
        origin.username ||
        origin.password ||
        origin.search ||
        origin.hash ||
        origin.pathname !== '/'
      ) {
        throw new Error('Invalid public origin');
      }

      this.unsubscribeBaseUrl = origin.origin;
    } catch {
      throw this.configurationError();
    }
  }

  async provisionWorkspace(_workspaceId: string): Promise<void> {}

  async deprovisionWorkspace(workspaceId: string): Promise<void> {
    this.transports.get(workspaceId)?.close();
    this.transports.delete(workspaceId);
  }

  async registerDomain(input: EmailingDomainResourceInput): Promise<void> {
    this.getConnection(input);
  }

  async cleanupDomain(_input: EmailingDomainResourceInput): Promise<void> {}

  async verifyDomain(
    input: EmailingDomainResourceInput,
  ): Promise<EmailingDomainVerificationResult> {
    this.getConnection(input);

    try {
      await this.getTransport(input).verify();
    } catch {
      return { status: EmailingDomainStatus.TEMPORARY_FAILURE, verificationRecords: [] };
    }

    // Sender authorization comes from the server operator's workspace allowlist.
    // SMTP connectivity does not prove that SPF or DKIM records are installed.
    return { status: EmailingDomainStatus.VERIFIED, verificationRecords: [] };
  }

  async getDomainStatus(
    input: EmailingDomainResourceInput,
  ): Promise<EmailingDomainVerificationResult> {
    return this.verifyDomain(input);
  }

  async sendEmail(
    input: EmailingDomainSendEmailRequest,
  ): Promise<EmailingDomainSendEmailResult> {
    this.assertSender(input);
    const email = this.unsubscribeContentService.addTo(input, this.unsubscribeBaseUrl);

    if (
      [...(email.headers ?? [])].some(
        ({ name, value }) => !/^[A-Za-z0-9-]+$/.test(name) || /[\r\n]/.test(value),
      )
    ) {
      throw this.configurationError();
    }

    try {
      const result = await this.getTransport(input).sendMail({
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        replyTo: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
        attachments: email.attachments,
        headers: email.headers?.map(({ name, value }) => ({ key: name, value })),
        disableFileAccess: true,
        disableUrlAccess: true,
      });

      if (typeof result.messageId !== 'string' || !result.messageId) {
        throw new Error('Missing transport receipt');
      }

      return {
        messageId: result.messageId,
        headerMessageId: result.messageId,
        // This legacy field records SMTP acceptance, never a delivery event.
        deliveredRecipients: {
          to: email.to.filter((address) => result.accepted?.includes(address)),
          cc: (email.cc ?? []).filter((address) => result.accepted?.includes(address)),
          bcc: (email.bcc ?? []).filter((address) => result.accepted?.includes(address)),
        },
      };
    } catch {
      // A lost response after DATA may already have sent the message.
      // Do not convert this into a retryable temporary-error exception.
      throw new EmailingDomainDriverException(
        'SMTP send outcome could not be confirmed; reconcile before retrying',
        EmailingDomainDriverExceptionCode.UNKNOWN,
      );
    }
  }

  async sendEmailBatch(
    input: EmailingDomainSendEmailBatchRequest,
  ): Promise<EmailingDomainSendEmailBatchResult> {
    this.assertSender(input);

    if (!input.recipients.length || input.recipients.length > 100) {
      throw this.configurationError();
    }

    const entries: EmailingDomainSendEmailBatchResult['entries'] = [];

    for (const [recipientIndex, recipient] of input.recipients.entries()) {
      try {
        const sent = await this.sendEmail({
          workspaceId: input.workspaceId,
          domain: input.domain,
          emailingDomain: input.emailingDomain,
          sendKind: input.sendKind,
          from: input.from,
          replyTo: input.replyTo,
          to: [recipient.email],
          subject: applyReplacementTags(input.template.subject, recipient.replacements),
          text: applyReplacementTags(input.template.text, recipient.replacements),
          html: input.template.html
            ? applyReplacementTags(input.template.html, recipient.replacements)
            : undefined,
          headers: recipient.headers,
          unsubscribeTopicId: input.unsubscribeTopicId,
        });

        entries.push({ recipientIndex, messageId: sent.messageId,
          headerMessageId: sent.headerMessageId, errorMessage: null });
      } catch {
        entries.push({ recipientIndex, messageId: null,
          headerMessageId: null, errorMessage: 'SMTP outcome unconfirmed; reconcile before retrying' });
      }
    }

    return { entries };
  }

  close(): void {
    for (const transport of this.transports.values()) transport.close();
    this.transports.clear();
  }

  private assertSender(input: EmailingDomainSendEmailRequest | EmailingDomainSendEmailBatchRequest): void {
    this.getConnection(input);
    const addresses = parseEmailAddressList(input.from);

    if (
      input.emailingDomain.workspaceId !== input.workspaceId ||
      input.emailingDomain.domain.toLowerCase() !== input.domain.toLowerCase() ||
      addresses.length !== 1 ||
      addresses[0].address?.split('@').pop()?.toLowerCase() !== input.domain.toLowerCase() ||
      /[\r\n]/.test(input.from)
    ) {
      throw this.configurationError();
    }
  }

  private getConnection(input: EmailingDomainResourceInput): HermesSmtpConnection {
    const connection = this.connections[input.workspaceId];

    if (!connection?.senderDomains.includes(input.domain.toLowerCase())) {
      throw this.configurationError();
    }

    return connection;
  }

  private getTransport(input: EmailingDomainResourceInput): SmtpTransport {
    const connection = this.getConnection(input);
    const existing = this.transports.get(input.workspaceId);

    if (existing) return existing;

    const transport = createTransport({
      host: connection.host,
      port: connection.port,
      secure: connection.security === 'tls',
      requireTLS: connection.security === 'starttls',
      ignoreTLS: connection.security === 'plaintext-loopback',
      auth: connection.username
        ? { user: connection.username, pass: connection.password ?? '' }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      pool: true,
      maxConnections: 1,
      rateLimit: 5,
      rateDelta: 1000,
    });

    this.transports.set(input.workspaceId, transport);

    return transport;
  }

  private configurationError(): EmailingDomainDriverException {
    return new EmailingDomainDriverException(
      'SMTP campaign connection is not configured for this workspace and sender domain',
      EmailingDomainDriverExceptionCode.CONFIGURATION_ERROR,
    );
  }
}
