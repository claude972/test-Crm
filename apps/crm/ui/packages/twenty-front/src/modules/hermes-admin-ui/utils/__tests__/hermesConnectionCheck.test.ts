import {
  canAttemptHermesSend,
  doesHermesProbeSendAnything,
  HERMES_CONNECTION_PROBES,
  isHermesConnectionFlowProven,
  isHermesConnectionReachable,
  isHermesKindProbable,
  readHermesConnectionStanding,
  readHermesProbesForUiKind,
  type HermesConnectionCheckOutcome,
  type HermesConnectionFlowProof,
} from '@/hermes-admin-ui/types/HermesConnectionCheck';

const CHECKED_AT = new Date('2026-10-30T10:00:00.000Z');
const OBSERVED_AT = new Date('2026-10-29T08:30:00.000Z');

const NO_PROOF: HermesConnectionFlowProof = { kind: 'none' };

describe('the probe catalogue', () => {
  it('contains no probe that sends anything', () => {
    // The whole point of a connection test here: it must not emit. This is
    // asserted over the catalogue so that adding an emitting probe fails.
    for (const probe of HERMES_CONNECTION_PROBES) {
      expect(doesHermesProbeSendAnything(probe)).toBe(false);
    }
  });

  it('offers only read-only operations the real providers support', () => {
    expect([...HERMES_CONNECTION_PROBES]).toEqual([
      'EVOLUTION_INSTANCE_STATE',
      'IMAP_LIST_STATUS',
      'SMTP_LOGIN_ONLY',
    ]);
  });

  it('keeps reception and sending as two separate mail probes', () => {
    // A mailbox that receives is not thereby a mailbox that sends. One answer
    // for both directions would hide a broken one behind a working one.
    expect(readHermesProbesForUiKind('EMAIL_IMAP')).toEqual([
      'IMAP_LIST_STATUS',
    ]);
    expect(readHermesProbesForUiKind('EMAIL_SMTP')).toEqual([
      'SMTP_LOGIN_ONLY',
    ]);
  });

  it('reports no probe for the channels this build does not test', () => {
    // MCP and signed collection belong to another lot. Claiming a probe for
    // them would offer a button that cannot do anything.
    expect(isHermesKindProbable('MCP')).toBe(false);
    expect(isHermesKindProbable('SIGNED_INTAKE')).toBe(false);
    expect(isHermesKindProbable('FORMS')).toBe(false);
    expect(isHermesKindProbable('APPOINTMENTS')).toBe(false);
    expect(isHermesKindProbable(null)).toBe(false);
  });

  it('reports a probe for WhatsApp and for both mail directions', () => {
    expect(isHermesKindProbable('WHATSAPP_EVOLUTION')).toBe(true);
    expect(isHermesKindProbable('EMAIL_IMAP')).toBe(true);
    expect(isHermesKindProbable('EMAIL_SMTP')).toBe(true);
  });
});

describe('isHermesConnectionReachable', () => {
  it('is true only for an answered probe', () => {
    const reachable: HermesConnectionCheckOutcome = {
      kind: 'reachable',
      probe: 'IMAP_LIST_STATUS',
      checkedAt: CHECKED_AT,
      observations: ['INBOX'],
    };

    expect(isHermesConnectionReachable(reachable)).toBe(true);
    expect(isHermesConnectionReachable({ kind: 'idle' })).toBe(false);
    expect(isHermesConnectionReachable({ kind: 'unconfirmed' })).toBe(false);
    expect(isHermesConnectionReachable({ kind: 'not-offered' })).toBe(false);
  });
});

describe('readHermesConnectionStanding', () => {
  it('reports reachability and proof separately, never one as the other', () => {
    // The heart of it: a provider answered a read-only question. That dates
    // reachability and proves no flow whatsoever.
    const standing = readHermesConnectionStanding(
      {
        kind: 'reachable',
        probe: 'EVOLUTION_INSTANCE_STATE',
        checkedAt: CHECKED_AT,
        observations: ['open'],
      },
      NO_PROOF,
    );

    expect(standing.reachability).toEqual({
      kind: 'reachable',
      checkedAt: CHECKED_AT,
    });
    expect(standing.proof).toEqual({ kind: 'none' });
  });

  it('keeps a proven flow while the provider is currently unreachable', () => {
    // A past exchange is still a fact. It does not make the channel reachable
    // now, and being unreachable now does not erase it.
    const standing = readHermesConnectionStanding(
      {
        kind: 'unreachable',
        probe: 'SMTP_LOGIN_ONLY',
        checkedAt: CHECKED_AT,
        errorCode: 'SMTP_AUTH_FAILED',
      },
      {
        kind: 'proven',
        flows: [{ flow: 'OUTBOUND_ACCEPTED', observedAt: OBSERVED_AT }],
      },
    );

    expect(standing.reachability).toEqual({
      kind: 'unreachable',
      checkedAt: CHECKED_AT,
      errorCode: 'SMTP_AUTH_FAILED',
    });
    expect(isHermesConnectionFlowProven(standing.proof, 'OUTBOUND_ACCEPTED')).toBe(
      true,
    );
  });

  it('does not report a refusal or a lost answer as the provider being unreachable', () => {
    for (const outcome of [
      { kind: 'refused', reason: 'FORBIDDEN' },
      { kind: 'unconfirmed' },
      { kind: 'session-replaced', message: null },
    ] satisfies HermesConnectionCheckOutcome[]) {
      expect(
        readHermesConnectionStanding(outcome, NO_PROOF).reachability.kind,
      ).toBe('inconclusive');
    }
  });

  it('starts from never-checked, which is not a failure', () => {
    expect(
      readHermesConnectionStanding({ kind: 'idle' }, NO_PROOF).reachability,
    ).toEqual({ kind: 'never-checked' });
    expect(
      readHermesConnectionStanding({ kind: 'checking' }, NO_PROOF).reachability,
    ).toEqual({ kind: 'never-checked' });
  });

  it('reports an unoffered probe as such, not as a provider failure', () => {
    expect(
      readHermesConnectionStanding({ kind: 'not-offered' }, NO_PROOF)
        .reachability,
    ).toEqual({ kind: 'not-offered' });
  });
});

describe('isHermesConnectionFlowProven', () => {
  it('answers per direction, because receiving is not sending', () => {
    const inboundOnly: HermesConnectionFlowProof = {
      kind: 'proven',
      flows: [{ flow: 'INBOUND_OBSERVED', observedAt: OBSERVED_AT }],
    };

    expect(isHermesConnectionFlowProven(inboundOnly, 'INBOUND_OBSERVED')).toBe(
      true,
    );
    expect(isHermesConnectionFlowProven(inboundOnly, 'OUTBOUND_ACCEPTED')).toBe(
      false,
    );
  });

  it('proves nothing from an unread ledger or an empty one', () => {
    expect(
      isHermesConnectionFlowProven({ kind: 'unknown' }, 'INBOUND_OBSERVED'),
    ).toBe(false);
    expect(
      isHermesConnectionFlowProven({ kind: 'none' }, 'INBOUND_OBSERVED'),
    ).toBe(false);
  });
});

describe('canAttemptHermesSend', () => {
  it('gates an attempt on reachability without demanding a proven flow', () => {
    // Requiring proof would make the very first send impossible.
    const reachable = readHermesConnectionStanding(
      {
        kind: 'reachable',
        probe: 'SMTP_LOGIN_ONLY',
        checkedAt: CHECKED_AT,
        observations: [],
      },
      NO_PROOF,
    );

    expect(canAttemptHermesSend(reachable)).toBe(true);
  });

  it('refuses an attempt when the gateway answered but the channel is not ready', () => {
    // An Evolution instance that is not paired answers its gateway perfectly
    // and still cannot send. Offering a send here would fail in front of the
    // operator with no explanation.
    const notReady = readHermesConnectionStanding(
      {
        kind: 'reachable-not-ready',
        probe: 'EVOLUTION_INSTANCE_STATE',
        checkedAt: CHECKED_AT,
        reason: 'CONNECTING',
      },
      NO_PROOF,
    );

    expect(notReady.reachability).toEqual({
      kind: 'reachable-not-ready',
      checkedAt: CHECKED_AT,
      reason: 'CONNECTING',
    });
    expect(canAttemptHermesSend(notReady)).toBe(false);
  });

  it('refuses an attempt on a configuration that moved under the probe', () => {
    expect(
      canAttemptHermesSend(
        readHermesConnectionStanding({ kind: 'connection-changed' }, NO_PROOF),
      ),
    ).toBe(false);
  });

  it('refuses an attempt on an inconclusive or unoffered check', () => {
    expect(
      canAttemptHermesSend(
        readHermesConnectionStanding({ kind: 'unconfirmed' }, NO_PROOF),
      ),
    ).toBe(false);
    expect(
      canAttemptHermesSend(
        readHermesConnectionStanding({ kind: 'not-offered' }, NO_PROOF),
      ),
    ).toBe(false);
  });

  it('does not let a past proven flow stand in for a current check', () => {
    // Proof is not permission to dial: the credentials may have been revoked
    // since. This is the inverse of the earlier case and the reason the two
    // notions are modelled separately.
    const provenButUnchecked = readHermesConnectionStanding(
      { kind: 'idle' },
      {
        kind: 'proven',
        flows: [{ flow: 'OUTBOUND_ACCEPTED', observedAt: OBSERVED_AT }],
      },
    );

    expect(canAttemptHermesSend(provenButUnchecked)).toBe(false);
  });
});
