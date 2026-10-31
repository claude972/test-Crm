import {
  readHermesEvolutionCheckPayload,
  readHermesMailCheckPayload,
} from '@/hermes-admin-runtime/utils/readHermesConnectionCheck';

const CHECKED_AT = '2026-10-31T09:15:00.000Z';
const CONNECTION_ID = 'c0ffee00-0000-4000-8000-000000000001';
const SCOPE = { connectionId: CONNECTION_ID, revision: '4' };

describe('readHermesMailCheckPayload', () => {
  it('reads a reachable IMAP probe with its instant and its observations', () => {
    const outcome = readHermesMailCheckPayload(
      {
        kind: 'MAIL',
        probe: 'IMAP_LIST_STATUS',
        outcome: 'REACHABLE',
        checkedAt: CHECKED_AT,
        connectionId: CONNECTION_ID,
        revision: 4,
        observations: ['folder:INBOX', 'messages:12', 'unseen:3'],
        errorCode: null,
        emitted: false,
      },
      'IMAP_LIST_STATUS',
      SCOPE,
    );

    expect(outcome).toEqual({
      kind: 'reachable',
      probe: 'IMAP_LIST_STATUS',
      checkedAt: new Date(CHECKED_AT),
      observations: ['folder:INBOX', 'messages:12', 'unseen:3'],
    });
  });

  it('refuses to date a reachability the server did not date', () => {
    // « Joignable le … » with nothing after it is not a checkable claim.
    const outcome = readHermesMailCheckPayload(
      {
        probe: 'SMTP_LOGIN_ONLY',
        outcome: 'REACHABLE',
        checkedAt: null,
        connectionId: CONNECTION_ID,
        revision: 4,
      },
      'SMTP_LOGIN_ONLY',
      SCOPE,
    );

    expect(outcome).toEqual({ kind: 'unconfirmed' });
  });

  it('does not show one direction answer against the other direction', () => {
    // A reply about reception must never be displayed as proof that sending
    // works, nor the reverse.
    const outcome = readHermesMailCheckPayload(
      {
        probe: 'IMAP_LIST_STATUS',
        outcome: 'REACHABLE',
        checkedAt: CHECKED_AT,
        connectionId: CONNECTION_ID,
        revision: 4,
        observations: [],
      },
      'SMTP_LOGIN_ONLY',
      SCOPE,
    );

    expect(outcome).toEqual({ kind: 'unconfirmed' });
  });

  it('reports an absent configuration as nothing configured, not as a failure', () => {
    expect(
      readHermesMailCheckPayload(
        { probe: 'IMAP_LIST_STATUS', outcome: 'NOT_CONFIGURED' },
        'IMAP_LIST_STATUS',
        SCOPE,
      ),
    ).toEqual({ kind: 'nothing-configured' });
  });

  it('reports a configuration that moved under the probe as neither pass nor fail', () => {
    expect(
      readHermesMailCheckPayload(
        { probe: 'SMTP_LOGIN_ONLY', outcome: 'CONNECTION_CHANGED' },
        'SMTP_LOGIN_ONLY',
        SCOPE,
      ),
    ).toEqual({ kind: 'connection-changed' });
  });

  it('keeps the server error code on an unreachable probe', () => {
    expect(
      readHermesMailCheckPayload(
        {
          probe: 'SMTP_LOGIN_ONLY',
          outcome: 'UNREACHABLE',
          checkedAt: CHECKED_AT,
          connectionId: CONNECTION_ID,
          revision: 4,
          errorCode: 'MAIL_AUTHENTICATION_FAILED',
        },
        'SMTP_LOGIN_ONLY',
        SCOPE,
      ),
    ).toEqual({
      kind: 'unreachable',
      probe: 'SMTP_LOGIN_ONLY',
      checkedAt: new Date(CHECKED_AT),
      errorCode: 'MAIL_AUTHENTICATION_FAILED',
    });
  });

  it('does not map an unpublished outcome onto a published one', () => {
    expect(
      readHermesMailCheckPayload(
        {
          probe: 'IMAP_LIST_STATUS',
          outcome: 'VERIFIED',
          checkedAt: CHECKED_AT,
          connectionId: CONNECTION_ID,
          revision: 4,
        },
        'IMAP_LIST_STATUS',
        SCOPE,
      ),
    ).toEqual({ kind: 'unconfirmed' });
  });

  it('treats an unreadable answer as proving nothing', () => {
    for (const payload of [null, undefined, 'REACHABLE', 42, []]) {
      expect(
        readHermesMailCheckPayload(payload, 'IMAP_LIST_STATUS', SCOPE),
      ).toEqual({ kind: 'unconfirmed' });
    }
  });

  it('drops an observation that is not a short printable string', () => {
    // The observation list is rendered, so it is not a pass-through for
    // whatever the server put in the array.
    const outcome = readHermesMailCheckPayload(
      {
        probe: 'IMAP_LIST_STATUS',
        outcome: 'REACHABLE',
        checkedAt: CHECKED_AT,
        connectionId: CONNECTION_ID,
        revision: 4,
        observations: ['folder:INBOX', '', '   ', 42, null, 'x'.repeat(200)],
      },
      'IMAP_LIST_STATUS',
      SCOPE,
    );

    expect(outcome).toEqual({
      kind: 'reachable',
      probe: 'IMAP_LIST_STATUS',
      checkedAt: new Date(CHECKED_AT),
      observations: ['folder:INBOX'],
    });
  });
});

describe('readHermesMailCheckPayload — bound to what it describes', () => {
  it('refuses an answer about another connection', () => {
    // A green badge must never land on a connection it was not computed for.
    expect(
      readHermesMailCheckPayload(
        {
          probe: 'IMAP_LIST_STATUS',
          outcome: 'REACHABLE',
          checkedAt: CHECKED_AT,
          connectionId: 'c0ffee00-0000-4000-8000-00000000ffff',
          revision: 4,
          observations: [],
        },
        'IMAP_LIST_STATUS',
        SCOPE,
      ),
    ).toEqual({ kind: 'connection-changed' });
  });

  it('refuses an answer about an earlier revision of the same connection', () => {
    // The configuration was rewritten, so this result describes credentials
    // that no longer exist.
    expect(
      readHermesMailCheckPayload(
        {
          probe: 'SMTP_LOGIN_ONLY',
          outcome: 'REACHABLE',
          checkedAt: CHECKED_AT,
          connectionId: CONNECTION_ID,
          revision: 3,
          observations: [],
        },
        'SMTP_LOGIN_ONLY',
        SCOPE,
      ),
    ).toEqual({ kind: 'connection-changed' });
  });

  it('refuses an answer that names no identity at all', () => {
    expect(
      readHermesMailCheckPayload(
        {
          probe: 'IMAP_LIST_STATUS',
          outcome: 'REACHABLE',
          checkedAt: CHECKED_AT,
          observations: [],
        },
        'IMAP_LIST_STATUS',
        SCOPE,
      ),
    ).toEqual({ kind: 'connection-changed' });
  });
});

describe('readHermesEvolutionCheckPayload', () => {
  it('reads a linked instance as reachable', () => {
    expect(
      readHermesEvolutionCheckPayload({
        status: 'PROVIDER_REPORTED_OPEN',
        providerState: 'open',
        checkedAt: CHECKED_AT,
        errorCode: null,
      }),
    ).toEqual({
      kind: 'reachable',
      probe: 'EVOLUTION_INSTANCE_STATE',
      checkedAt: new Date(CHECKED_AT),
      observations: ['instance:open'],
    });
  });

  it('keeps an answered gateway with an unfinished pairing apart from both', () => {
    // The most common real case. Calling it connected would promise a channel
    // that cannot send; calling it unreachable would send the operator hunting
    // a network fault that does not exist.
    for (const status of ['CONNECTING', 'DISCONNECTED']) {
      expect(
        readHermesEvolutionCheckPayload({
          status,
          providerState: 'close',
          checkedAt: CHECKED_AT,
          errorCode: null,
        }),
      ).toEqual({
        kind: 'reachable-not-ready',
        probe: 'EVOLUTION_INSTANCE_STATE',
        checkedAt: new Date(CHECKED_AT),
        reason: status,
      });
    }
  });

  it('reads an unavailable gateway as unreachable, with its code', () => {
    expect(
      readHermesEvolutionCheckPayload({
        status: 'UNAVAILABLE',
        providerState: null,
        checkedAt: CHECKED_AT,
        errorCode: 'AUTHENTICATION_FAILED',
      }),
    ).toEqual({
      kind: 'unreachable',
      probe: 'EVOLUTION_INSTANCE_STATE',
      checkedAt: new Date(CHECKED_AT),
      errorCode: 'AUTHENTICATION_FAILED',
    });
  });

  it('reports an unconfigured instance as nothing configured', () => {
    expect(
      readHermesEvolutionCheckPayload({
        status: 'NOT_CONFIGURED',
        providerState: null,
        checkedAt: CHECKED_AT,
        errorCode: null,
      }),
    ).toEqual({ kind: 'nothing-configured' });
  });

  it('proves nothing from an unreadable or undated answer', () => {
    expect(readHermesEvolutionCheckPayload(null)).toEqual({
      kind: 'unconfirmed',
    });
    expect(
      readHermesEvolutionCheckPayload({
        status: 'PROVIDER_REPORTED_OPEN',
        checkedAt: 'not-a-date',
      }),
    ).toEqual({ kind: 'unconfirmed' });
    expect(
      readHermesEvolutionCheckPayload({ status: 'SOMETHING_ELSE', checkedAt: CHECKED_AT }),
    ).toEqual({ kind: 'unconfirmed' });
  });
});
