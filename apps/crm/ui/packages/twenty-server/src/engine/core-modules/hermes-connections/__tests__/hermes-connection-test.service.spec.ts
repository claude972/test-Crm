import { ForbiddenException } from '@nestjs/common';

import { HermesConnectionTestService } from 'src/engine/core-modules/hermes-connections/hermes-connection-test.service';

// A protocol-level demonstration, not a verified real connector.
//
// Every provider below is a mock standing in for IMAP and SMTP. These tests
// prove what the probe DOES and — more importantly — what it never does. They
// prove nothing about any real mail server: no host, credential, certificate
// or live session is involved anywhere in this file.

const ACTOR = {
  workspaceId: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  userWorkspaceId: '33333333-3333-4333-8333-333333333333',
};

const ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';

const resolved = (revision = 4) => ({
  workspaceId: ACTOR.workspaceId,
  connectionId: '55555555-5555-4555-8555-555555555555',
  revision,
  userId: ACTOR.userId,
  userWorkspaceId: ACTOR.userWorkspaceId,
  settings: { connectedAccountId: ACCOUNT_ID, mailbox: 'INBOX', handle: 'a@b.test' },
  secrets: {},
});

// Every mailbox-mutating operation IMAP offers. The probe must touch none of
// them, so they are all present as spies that must stay unused.
const mutatingImapOperations = [
  'fetch',
  'fetchOne',
  'fetchAll',
  'append',
  'messageMove',
  'messageCopy',
  'messageDelete',
  'messageFlagsAdd',
  'messageFlagsRemove',
  'mailboxCreate',
  'mailboxDelete',
] as const;

const buildImapClient = (
  overrides: Partial<{ list: jest.Mock; status: jest.Mock }> = {},
) => {
  const client: Record<string, jest.Mock> = {
    list: overrides.list ?? jest.fn().mockResolvedValue([{ path: 'INBOX' }]),
    status:
      overrides.status ?? jest.fn().mockResolvedValue({ messages: 12, unseen: 3 }),
  };

  for (const operation of mutatingImapOperations) {
    client[operation] = jest.fn();
  }

  return client;
};

const buildService = (options: {
  resolve: jest.Mock;
  assertAllowed?: jest.Mock;
  imapClient?: Record<string, jest.Mock>;
  transporter?: Record<string, jest.Mock>;
  getClient?: jest.Mock;
  getTransporter?: jest.Mock;
}) => {
  const imapClient = options.imapClient ?? buildImapClient();
  const transporter =
    options.transporter ??
    ({
      verify: jest.fn().mockResolvedValue(true),
      close: jest.fn(),
      sendMail: jest.fn(),
    } as Record<string, jest.Mock>);

  const closeClient = jest.fn().mockResolvedValue(undefined);
  const getClient = options.getClient ?? jest.fn().mockResolvedValue(imapClient);
  const getTransporter =
    options.getTransporter ?? jest.fn().mockResolvedValue(transporter);
  const assertAllowed = options.assertAllowed ?? jest.fn().mockResolvedValue(undefined);

  const service = new HermesConnectionTestService(
    { resolve: options.resolve } as never,
    { assertAllowed } as never,
    { getClient, closeClient } as never,
    { getClient: getTransporter } as never,
  );

  return {
    service,
    imapClient,
    transporter,
    closeClient,
    getClient,
    getTransporter,
    assertAllowed,
  };
};

describe('HermesConnectionTestService — what a test never does', () => {
  it('never sends mail on the SMTP probe: it authenticates and closes', async () => {
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
    });

    const result = await harness.service.testMail(ACTOR, 'SMTP_LOGIN_ONLY');

    // The one provider call is `verify`, which is greeting + TLS + AUTH + QUIT.
    expect(harness.transporter.verify).toHaveBeenCalledTimes(1);
    // The claim that matters: no message was handed to the transport.
    expect(harness.transporter.sendMail).not.toHaveBeenCalled();
    expect(harness.transporter.close).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe('REACHABLE');
    expect(result.emitted).toBe(false);
    expect(result.observations).toEqual(['smtp:authenticated']);
  });

  it('never writes to the mailbox on the IMAP probe: it lists and reads counters', async () => {
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
    });

    const result = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');

    expect(harness.imapClient.list).toHaveBeenCalledTimes(1);
    expect(harness.imapClient.status).toHaveBeenCalledWith('INBOX', {
      messages: true,
      unseen: true,
    });

    // Nothing is fetched, flagged, moved, appended or deleted — so an unread
    // message is still unread after a test.
    for (const operation of mutatingImapOperations) {
      expect(harness.imapClient[operation]).not.toHaveBeenCalled();
    }

    expect(result.outcome).toBe('REACHABLE');
    expect(result.emitted).toBe(false);
    expect(result.observations).toEqual([
      'folder:INBOX',
      'messages:12',
      'unseen:3',
    ]);
  });

  it('closes the IMAP session even when the probe fails', async () => {
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
      imapClient: buildImapClient({
        list: jest.fn().mockRejectedValue(new Error('connection reset')),
      }),
    });

    const result = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');

    expect(harness.closeClient).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe('UNREACHABLE');
  });
});

describe('HermesConnectionTestService — honest outcomes', () => {
  it('reports an absent configuration as not configured, not as a failure', async () => {
    // Nothing was dialled, so no provider can be blamed.
    const harness = buildService({ resolve: jest.fn().mockResolvedValue(null) });

    const result = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');

    expect(result.outcome).toBe('NOT_CONFIGURED');
    expect(result.errorCode).toBeNull();
    expect(result.connectionId).toBeNull();
    expect(harness.getClient).not.toHaveBeenCalled();
  });

  it('does not report a reachable result when the configuration changed under the probe', async () => {
    // The credential was rotated while the probe was in flight. The answer
    // describes credentials that are no longer current, so showing it as a
    // success would tick a box for something nobody tested.
    const harness = buildService({
      resolve: jest
        .fn()
        .mockResolvedValueOnce(resolved(4))
        .mockResolvedValueOnce(resolved(5)),
    });

    const result = await harness.service.testMail(ACTOR, 'SMTP_LOGIN_ONLY');

    expect(result.outcome).toBe('CONNECTION_CHANGED');
    expect(result.errorCode).toBe('MAIL_CONNECTION_CHANGED');
    expect(result.observations).toEqual([]);
  });

  it('does not report a reachable result when the connection was removed under the probe', async () => {
    const harness = buildService({
      resolve: jest
        .fn()
        .mockResolvedValueOnce(resolved(4))
        .mockResolvedValueOnce(null),
    });

    const result = await harness.service.testMail(ACTOR, 'SMTP_LOGIN_ONLY');

    expect(result.outcome).toBe('CONNECTION_CHANGED');
  });

  it('names a missing bound folder instead of blaming the server', async () => {
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
      imapClient: buildImapClient({
        list: jest.fn().mockResolvedValue([{ path: 'Archive' }]),
      }),
    });

    const result = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');

    expect(result.outcome).toBe('UNREACHABLE');
    expect(result.errorCode).toBe('IMAP_FOLDER_NOT_FOUND');
    // The folder is never selected when it is not in the real LIST.
    expect(harness.imapClient.status).not.toHaveBeenCalled();
  });

  it('keeps reception and sending as two separate answers', async () => {
    // Reception works, sending does not. One combined verdict would hide that.
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
      transporter: {
        verify: jest.fn().mockRejectedValue(
          Object.assign(new Error('Invalid login'), { responseCode: 535 }),
        ),
        close: jest.fn(),
        sendMail: jest.fn(),
      },
    });

    const imap = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');
    const smtp = await harness.service.testMail(ACTOR, 'SMTP_LOGIN_ONLY');

    expect(imap.outcome).toBe('REACHABLE');
    expect(smtp.outcome).toBe('UNREACHABLE');
    expect(smtp.errorCode).toBe('MAIL_AUTHENTICATION_FAILED');
    expect(harness.transporter.sendMail).not.toHaveBeenCalled();
  });
});

describe('HermesConnectionTestService — secrets and hosts stay server side', () => {
  it('reduces a provider failure to a code, keeping the host out of the answer', async () => {
    // Transport errors routinely carry the host, the port and the rejected
    // credential. None of that may reach the browser.
    const leaky = Object.assign(
      new Error('connect ECONNREFUSED imap.secret-host.test:993 user=admin'),
      { responseCode: 421 },
    );

    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
      imapClient: buildImapClient({ list: jest.fn().mockRejectedValue(leaky) }),
    });

    const result = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');

    expect(result.errorCode).toBe('IMAP_UNAVAILABLE');

    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('secret-host');
    expect(serialized).not.toContain('admin');
    expect(serialized).not.toContain('993');
  });

  it('carries no secret and no credential in a successful answer either', async () => {
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
    });

    const result = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('a@b.test');
    expect(Object.keys(result)).not.toContain('secrets');
  });

  it('maps a recognised authentication refusal rather than a generic failure', async () => {
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
      imapClient: buildImapClient({
        list: jest.fn().mockRejectedValue(new Error('Authentication failed')),
      }),
    });

    const result = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');

    expect(result.errorCode).toBe('MAIL_AUTHENTICATION_FAILED');
  });

  it('refuses a malformed historical binding before reaching a transport', async () => {
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue({
        ...resolved(),
        settings: { connectedAccountId: ACCOUNT_ID, mailbox: 42 },
      }),
    });

    const result = await harness.service.testMail(ACTOR, 'IMAP_LIST_STATUS');

    expect(result.errorCode).toBe('MAIL_BINDING_INVALID');
    expect(harness.getClient).not.toHaveBeenCalled();
  });
});

describe('HermesConnectionTestService — authorization is not relaxed', () => {
  it('applies the same unrestricted-administrator gate and dials nothing when refused', async () => {
    const assertAllowed = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('PROSPECTION_REQUIRES_UNRESTRICTED_WORKSPACE_ADMIN'),
      );
    const resolve = jest.fn();

    const harness = buildService({ resolve, assertAllowed });

    await expect(
      harness.service.testMail(ACTOR, 'SMTP_LOGIN_ONLY'),
    ).rejects.toThrow('PROSPECTION_REQUIRES_UNRESTRICTED_WORKSPACE_ADMIN');

    // The gate runs before the configuration is even read.
    expect(resolve).not.toHaveBeenCalled();
    expect(harness.getTransporter).not.toHaveBeenCalled();
  });

  it('checks authorization for the workspace of the authenticated session', async () => {
    const harness = buildService({
      resolve: jest.fn().mockResolvedValue(resolved()),
    });

    await harness.service.testMail(ACTOR, 'SMTP_LOGIN_ONLY');

    expect(harness.assertAllowed).toHaveBeenCalledWith(ACTOR);
  });
});
