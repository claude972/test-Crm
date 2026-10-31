import {
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';

import { type Transporter } from 'nodemailer';

import { isDefined, parseEmailAddressList } from 'kovaa-lab-shared/utils';

import {
  EmailingDomainDriverException,
  EmailingDomainDriverExceptionCode,
} from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import { SmtpClientProvider } from 'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider';

// Structural view of what the connection centre publishes to senders: the
// mailbox identity, its exact address, the current revision and the workspace
// it is scoped to. Declared here, like HermesMailService does, so campaign
// sending reads the centre without importing or changing it.
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

export type AuthorizedMailbox = {
  // Identity of this exact resolution. A rotation changes it, which is what
  // makes a cached transport invalid.
  cacheKey: string;
  connectedAccountId: string;
  address: string;
};

const normalizeAddress = (value: unknown): string | null =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= 320 &&
  !/[\r\n\x00<>]/.test(value)
    ? value.trim().toLowerCase()
    : null;

// Campaign sending used to take its relay from EMAILING_SMTP_CONNECTIONS and
// accept any address on the verified domain, so a mailbox registered in the
// connection centre governed nothing. This provider makes that registered
// mailbox both the authority and the transport: one resolution decides whether
// the send may happen, under which exact address, and through which account.
@Injectable()
export class EmailingDomainMailboxTransportProvider {
  constructor(
    private readonly smtpClientProvider: SmtpClientProvider,
    // Published by the @Global() HermesConnectionsModule. Optional only so a
    // deployment that has not installed the connection centre keeps booting.
    @Optional()
    @Inject('HERMES_CONNECTIONS_SERVICE')
    private readonly connections?: EmailingDomainMailConnectionReader,
  ) {}

  get isConnectionCentreInstalled(): boolean {
    return isDefined(this.connections);
  }

  // Resolved at the moment of sending and never captured earlier: the centre
  // re-reads the row and refuses a revision that moved under us. fromAddress is
  // null only where there is no envelope sender yet, such as domain
  // verification; every send passes the address it intends to use.
  async authorize(
    workspaceId: string,
    fromAddress: string | null,
  ): Promise<AuthorizedMailbox> {
    if (!this.connections) {
      throw this.refuse('the connection centre is not installed');
    }

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

    const address = normalizeAddress(resolved.settings.handle);

    if (!address || !isDefined(resolved.settings.connectedAccountId)) {
      throw this.refuse(
        'the registered mail connection publishes no usable mailbox',
      );
    }

    if (fromAddress !== null) {
      const parsed = parseEmailAddressList(fromAddress);
      const sender =
        parsed.length === 1 ? normalizeAddress(parsed[0]?.address) : null;

      // Sharing the verified domain carries no authority: only the registered
      // mailbox's exact address may send.
      if (sender !== address) {
        throw this.refuse(
          `sender ${sender ?? 'address'} is not the registered mailbox ${address}`,
        );
      }
    }

    return {
      cacheKey: `${workspaceId}|${resolved.connectionId}|${resolved.revision}`,
      connectedAccountId: resolved.settings.connectedAccountId,
      address,
    };
  }

  // The account's SMTP credentials are decrypted and consumed inside the native
  // client provider; they never surface here, in the driver or in an error.
  async openTransport(connectedAccountId: string): Promise<Transporter> {
    try {
      return await this.smtpClientProvider.getClient(connectedAccountId, {
        timeoutMs: 30_000,
      });
    } catch {
      throw this.refuse(
        'the registered mailbox could not be opened for sending',
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
