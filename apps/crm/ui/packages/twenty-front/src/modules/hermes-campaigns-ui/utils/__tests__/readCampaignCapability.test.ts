import { type HermesCampaignCapability } from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import { type HermesSenderIdentityAuthorization } from '@/hermes-campaigns-ui/types/HermesSenderIdentityAuthorization';
import { readCampaignCapability } from '@/hermes-campaigns-ui/utils/readCampaignCapability';

const allowed: HermesCampaignCapability = {
  allowed: true,
  reasonCode: null,
  reason: null,
};

const refused: HermesCampaignCapability = {
  allowed: false,
  reasonCode: 'CAPABILITY_UNAVAILABLE',
  reason: 'The mailbox, the licence and the transport are not verified.',
};

const unreadable: HermesCampaignCapability = {
  allowed: null,
  reasonCode: null,
  reason: null,
};

const authorizedIdentity: HermesSenderIdentityAuthorization = { allowed: true };

const refusedIdentity: HermesSenderIdentityAuthorization = {
  allowed: false,
  code: 'MAILBOX_NOT_DELEGATED',
  serverReasonCode: null,
  serverReason: null,
};

describe('readCampaignCapability', () => {
  it('opens a control only on a published true', () => {
    expect(
      readCampaignCapability({
        name: 'send',
        capability: allowed,
        identityAuthorization: authorizedIdentity,
      }),
    ).toEqual({ kind: 'allowed' });
  });

  it('keeps the server refusal, with its code and sentence', () => {
    expect(
      readCampaignCapability({
        name: 'send',
        capability: refused,
        identityAuthorization: authorizedIdentity,
      }),
    ).toEqual({
      kind: 'refused',
      origin: 'server',
      reasonCode: 'CAPABILITY_UNAVAILABLE',
      reason: 'The mailbox, the licence and the transport are not verified.',
    });
  });

  // Unverified is unavailable: a null flag is not rounded up to true.
  it('reports an unreadable flag as unknown, never as available', () => {
    expect(
      readCampaignCapability({
        name: 'send',
        capability: unreadable,
        identityAuthorization: authorizedIdentity,
      }),
    ).toEqual({ kind: 'unknown' });
  });

  it('reports a capability the server never published as unknown', () => {
    expect(
      readCampaignCapability({
        name: 'send',
        capability: null,
        identityAuthorization: authorizedIdentity,
      }),
    ).toEqual({ kind: 'unknown' });
  });

  it.each(['testSynthetic', 'schedule', 'send'] as const)(
    'refuses %s when the identity it would run under is refused',
    (name) => {
      expect(
        readCampaignCapability({
          name,
          capability: allowed,
          identityAuthorization: refusedIdentity,
        }),
      ).toEqual({
        kind: 'refused',
        origin: 'sender-identity',
        reasonCode: 'MAILBOX_NOT_DELEGATED',
        reason: null,
      });
    },
  );

  it.each(['testSynthetic', 'schedule', 'send'] as const)(
    'leaves %s unknown while no identity is chosen',
    (name) => {
      expect(
        readCampaignCapability({
          name,
          capability: allowed,
          identityAuthorization: null,
        }),
      ).toEqual({ kind: 'unknown' });
    },
  );

  // A preview emits nothing, so the identity has no say over it.
  it('allows a preview whatever the identity says', () => {
    expect(
      readCampaignCapability({
        name: 'preview',
        capability: allowed,
        identityAuthorization: refusedIdentity,
      }),
    ).toEqual({ kind: 'allowed' });
  });

  // Stopping an avoidable departure has to stay reachable exactly when an
  // identity has just been withdrawn.
  it('allows a cancellation whatever the identity says', () => {
    expect(
      readCampaignCapability({
        name: 'cancel',
        capability: allowed,
        identityAuthorization: refusedIdentity,
      }),
    ).toEqual({ kind: 'allowed' });
  });

  it('prefers the server reason code of a refused identity when there is one', () => {
    expect(
      readCampaignCapability({
        name: 'send',
        capability: allowed,
        identityAuthorization: {
          allowed: false,
          code: 'SERVER_REFUSED',
          serverReasonCode: 'SENDER_IDENTITY_NOT_AUTHORIZED',
          serverReason: 'Not delegated.',
        },
      }),
    ).toEqual({
      kind: 'refused',
      origin: 'sender-identity',
      reasonCode: 'SENDER_IDENTITY_NOT_AUTHORIZED',
      reason: 'Not delegated.',
    });
  });

  it('lets the server refusal win over the identity, because it is the nearer cause', () => {
    expect(
      readCampaignCapability({
        name: 'send',
        capability: refused,
        identityAuthorization: refusedIdentity,
      }),
    ).toMatchObject({ kind: 'refused', origin: 'server' });
  });
});
