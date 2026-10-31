import { Injectable } from '@nestjs/common';
import { type ImapFlow } from 'imapflow';

import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { type HermesMessagingActor } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { ImapClientProvider } from 'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider';
import { SmtpClientProvider } from 'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider';

import { HermesConnectionsService } from './hermes-connections.service';

// Asks the configured mail server a question that changes nothing, and reports
// whether it answered. It never sends mail: the SMTP path stops at
// authentication and the IMAP path only lists folders and reads counters. It
// starts no campaign, sync or poll. A success proves the server was reachable
// at one instant — not that any mail will arrive.

// The two read-only operations, named so the operator can be told what was
// actually dialled rather than being shown a bare green tick.
export type HermesMailProbe = 'IMAP_LIST_STATUS' | 'SMTP_LOGIN_ONLY';

export type HermesMailProbeOutcome =
  // No mail connection is configured, so there was nothing to dial. Not a
  // failure of any provider.
  | 'NOT_CONFIGURED'
  // The server answered. The strongest claim a read-only probe can support.
  | 'REACHABLE'
  // The server was dialled and did not answer usefully.
  | 'UNREACHABLE'
  // The configuration changed under the probe, so its answer belongs to a
  // configuration that is no longer current and is not reported as either.
  | 'CONNECTION_CHANGED';

export type HermesConnectionTestResult = {
  kind: 'MAIL';
  probe: HermesMailProbe;
  outcome: HermesMailProbeOutcome;
  checkedAt: Date;
  // The configuration this answer belongs to. The client compares it before
  // showing the result, so an answer cannot be displayed against a
  // configuration that has since been changed by someone else.
  connectionId: string | null;
  revision: number | null;
  // Named, non-sensitive facts the server reported — the bound folder, its
  // counters. Never a host, a username, a password or a raw provider message.
  observations: string[];
  // A sanitized code, never a provider string. Transport errors routinely
  // carry the host, the port and sometimes the credentials.
  errorCode: string | null;
  // Stated in the payload itself and asserted by the tests, so a reader of the
  // API does not have to trust a comment.
  emitted: false;
};

// A probe must not hang a request. Shorter than the 45 s mailbox session
// deadline: this is a diagnostic the operator is waiting on.
const PROBE_DEADLINE_MS = 15000;

const SMTP_PROBE_TIMEOUT_MS = 10000;

class ProbeFailure extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const deadline = async <T>(run: Promise<T>): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      run,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new ProbeFailure('MAIL_TIMEOUT')),
          PROBE_DEADLINE_MS,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
};

// Every provider failure becomes one of a closed set of codes. The raw error
// is dropped rather than attached: IMAP and SMTP failures carry the host, the
// port and sometimes the rejected credential.
const sanitize = (failure: unknown, fallback: string): string => {
  if (failure instanceof ProbeFailure) {
    return failure.code;
  }

  const code =
    typeof failure === 'object' &&
    failure !== null &&
    'responseCode' in failure &&
    typeof (failure as { responseCode?: unknown }).responseCode === 'number'
      ? (failure as { responseCode: number }).responseCode
      : null;

  // 535/534/538 are the authentication refusals; 5xx otherwise is a permanent
  // server refusal. Anything else stays the generic fallback.
  if (code === 535 || code === 534 || code === 538) {
    return 'MAIL_AUTHENTICATION_FAILED';
  }

  const authenticationFailed =
    failure instanceof Error &&
    /\bauthenticat|\blogin\b|\bcredential/i.test(failure.message);

  return authenticationFailed ? 'MAIL_AUTHENTICATION_FAILED' : fallback;
};

@Injectable()
export class HermesConnectionTestService {
  constructor(
    private readonly connections: HermesConnectionsService,
    private readonly access: HermesProspectionAccessService,
    private readonly imap: ImapClientProvider,
    private readonly smtp: SmtpClientProvider,
  ) {}

  // Runs one read-only probe against the workspace's bound mail account. The
  // same unchanged authorization gate as every other connection operation
  // applies: an unrestricted workspace administrator of this workspace.
  async testMail(
    actor: HermesMessagingActor,
    probe: HermesMailProbe,
  ): Promise<HermesConnectionTestResult> {
    await this.access.assertAllowed(actor);

    const checkedAt = new Date();

    const resolved = await this.connections.resolve(actor.workspaceId, 'MAIL');

    // Nothing is configured. Reported as such rather than as a provider that
    // could not be reached, which would blame a server nobody dialled.
    if (resolved === null) {
      return {
        kind: 'MAIL',
        probe,
        outcome: 'NOT_CONFIGURED',
        checkedAt,
        connectionId: null,
        revision: null,
        observations: [],
        errorCode: null,
        emitted: false,
      };
    }

    // `resolve` revalidates the CONFIGURATION OWNER, who need not be the
    // caller. A second administrator revoked while this ran must not receive
    // the answer, so the caller's own rights are re-affirmed after every wait.
    await this.access.assertAllowed(actor);

    const connectedAccountId = resolved.settings.connectedAccountId;
    const mailbox = resolved.settings.mailbox;

    // The resolver already validated these; a defensive check keeps a
    // malformed historical record from reaching a transport call.
    if (typeof connectedAccountId !== 'string' || typeof mailbox !== 'string') {
      return {
        kind: 'MAIL',
        probe,
        outcome: 'UNREACHABLE',
        checkedAt,
        connectionId: resolved.connectionId,
        revision: resolved.revision,
        observations: [],
        errorCode: 'MAIL_BINDING_INVALID',
        emitted: false,
      };
    }

    let observations: readonly string[] = [];
    let errorCode: string | null = null;

    try {
      observations = await deadline(
        probe === 'IMAP_LIST_STATUS'
          ? this.probeImap(connectedAccountId, mailbox)
          : this.probeSmtp(connectedAccountId),
      );
    } catch (failure) {
      errorCode = sanitize(
        failure,
        probe === 'IMAP_LIST_STATUS' ? 'IMAP_UNAVAILABLE' : 'SMTP_UNAVAILABLE',
      );
    }

    // The caller's rights again, now that the probe and its close are done.
    // Nothing private — counters, folder names, an authentication result —
    // may be returned to someone revoked while the session was open.
    await this.access.assertAllowed(actor);

    // Re-read AFTER the probe. A credential rotated in flight means this
    // answer describes a configuration that is no longer current, and
    // reporting it as current would tick a box for credentials nobody tested.
    const current = await this.connections
      .resolve(actor.workspaceId, 'MAIL')
      .catch(() => null);

    // The last gate before anything is answered, covering both returns below.
    await this.access.assertAllowed(actor);

    if (
      current === null ||
      current.connectionId !== resolved.connectionId ||
      current.revision !== resolved.revision
    ) {
      return {
        kind: 'MAIL',
        probe,
        outcome: 'CONNECTION_CHANGED',
        checkedAt,
        connectionId: resolved.connectionId,
        revision: resolved.revision,
        observations: [],
        errorCode: 'MAIL_CONNECTION_CHANGED',
        emitted: false,
      };
    }

    return {
      kind: 'MAIL',
      probe,
      outcome: errorCode === null ? 'REACHABLE' : 'UNREACHABLE',
      checkedAt,
      connectionId: resolved.connectionId,
      revision: resolved.revision,
      observations: [...observations],
      errorCode,
      emitted: false,
    };
  }

  // IMAP, read-only: open the session, list the folders, read one folder's
  // counters. `list` and `status` are the two operations the mailbox screen
  // already relies on, so nothing new is asked of the provider.
  private async probeImap(
    connectedAccountId: string,
    mailbox: string,
  ): Promise<readonly string[]> {
    let client: ImapFlow | null = null;

    try {
      client = await this.imap.getClient(connectedAccountId);

      const folders = await client.list();

      // The bound folder must exist in the real LIST before it is selected.
      // A folder that is gone is a configuration problem the operator can fix,
      // and it is reported as that rather than as an unreachable server.
      const bound = folders.find((folder) => folder.path === mailbox);

      if (bound === undefined) {
        throw new ProbeFailure('IMAP_FOLDER_NOT_FOUND');
      }

      // Counters only. `status` selects nothing and changes no flag, so an
      // unread message stays unread after a test.
      const status = await client.status(mailbox, {
        messages: true,
        unseen: true,
      });

      const observations = [`folder:${bound.path}`];

      if (typeof status.messages === 'number') {
        observations.push(`messages:${status.messages}`);
      }

      if (typeof status.unseen === 'number') {
        observations.push(`unseen:${status.unseen}`);
      }

      return observations;
    } finally {
      if (client !== null) {
        // Closing must never turn a successful probe into a failure.
        await this.imap.closeClient(client).catch(() => {});
      }
    }
  }

  // SMTP, authentication only. `verify` connects, greets, upgrades to TLS and
  // authenticates, then closes. It does not call `sendMail`, and no envelope
  // or body is built here, so nothing in this method can emit.
  private async probeSmtp(
    connectedAccountId: string,
  ): Promise<readonly string[]> {
    const transporter = await this.smtp.getClient(connectedAccountId, {
      timeoutMs: SMTP_PROBE_TIMEOUT_MS,
    });

    try {
      await transporter.verify();

      // No counters to report: the envelope was never opened. The observation
      // names what was established, which is exactly the login.
      return ['smtp:authenticated'];
    } finally {
      transporter.close();
    }
  }
}
