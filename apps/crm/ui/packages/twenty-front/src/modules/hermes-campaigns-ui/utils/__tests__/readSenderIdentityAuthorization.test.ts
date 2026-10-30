import { type HermesSenderIdentity } from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
import { readSenderIdentityAuthorization } from '@/hermes-campaigns-ui/utils/readSenderIdentityAuthorization';

const buildIdentity = (
  identity: Partial<HermesSenderIdentity> = {},
): HermesSenderIdentity => ({
  id: 'si-1',
  displayedAddress: 'contact@atelier-fontaine.fr',
  domain: 'atelier-fontaine.fr',
  connectionLogin: 'smtp-user-7',
  delegatedMailbox: {
    label: 'Main mailbox',
    address: 'contact@atelier-fontaine.fr',
    delegated: true,
    attestedAt: '2026-10-28T09:00:00.000Z',
    proof: 'Delegation attested on the exact mailbox.',
  },
  authorizedAliases: ['devis@atelier-fontaine.fr'],
  replyToAddress: 'contact@atelier-fontaine.fr',
  state: 'verified',
  unknownState: null,
  serverVerdict: { allowed: true, reasonCode: null, reason: null },
  ...identity,
});

describe('readSenderIdentityAuthorization', () => {
  it('allows a verified identity whose exact mailbox is delegated', () => {
    expect(readSenderIdentityAuthorization(buildIdentity())).toEqual({
      allowed: true,
    });
  });

  it('allows an explicitly authorised alias of that mailbox', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({
        displayedAddress: 'devis@atelier-fontaine.fr',
        replyToAddress: 'devis@atelier-fontaine.fr',
      }),
    );

    expect(authorization).toEqual({ allowed: true });
  });

  // The rule the whole screen exists for: the right domain is not a mailbox.
  it('refuses the right domain without a delegation, and says so', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({
        displayedAddress: 'commercial@atelier-fontaine.fr',
        delegatedMailbox: {
          label: 'Not linked to a connected mailbox',
          address: null,
          delegated: false,
          attestedAt: null,
          proof: 'Same domain allowed, but no delegation of this mailbox.',
        },
      }),
    );

    expect(authorization.allowed).toBe(false);
    expect(authorization).toMatchObject({ code: 'MAILBOX_NOT_DELEGATED' });
  });

  it('refuses an unreadable delegation flag, which is not a delegation', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({
        delegatedMailbox: {
          label: 'Main mailbox',
          address: 'contact@atelier-fontaine.fr',
          delegated: null,
          attestedAt: null,
          proof: null,
        },
      }),
    );

    expect(authorization).toMatchObject({
      allowed: false,
      code: 'MAILBOX_DELEGATION_UNKNOWN',
    });
  });

  it('refuses an address inside the right domain but outside the alias list', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({ displayedAddress: 'promo@atelier-fontaine.fr' }),
    );

    expect(authorization).toMatchObject({
      allowed: false,
      code: 'DISPLAYED_ADDRESS_NOT_AUTHORIZED',
    });
  });

  it('refuses a reply address outside the mailbox and its aliases', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({ replyToAddress: 'ops@elsewhere.example' }),
    );

    expect(authorization).toMatchObject({
      allowed: false,
      code: 'REPLY_TO_NOT_AUTHORIZED',
    });
  });

  it('allows an identity with no reply address: replies reach the From address', () => {
    expect(
      readSenderIdentityAuthorization(buildIdentity({ replyToAddress: null })),
    ).toEqual({ allowed: true });
  });

  it.each(['unverified', 'revoked'] as const)(
    'refuses a %s identity even when the server allowed it',
    (state) => {
      const authorization = readSenderIdentityAuthorization(
        buildIdentity({ state }),
      );

      expect(authorization).toMatchObject({
        allowed: false,
        code: state === 'revoked' ? 'IDENTITY_REVOKED' : 'IDENTITY_NOT_VERIFIED',
      });
    },
  );

  it('refuses a state outside the contract rather than reading it as verified', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({ state: null, unknownState: 'PENDING_REVIEW' }),
    );

    expect(authorization).toMatchObject({
      allowed: false,
      code: 'IDENTITY_STATE_UNKNOWN',
    });
  });

  // An unverified right is an unavailable right: a missing verdict is not a
  // yes, however complete the rest of the identity looks.
  it('refuses an identity the server published no verdict for', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({ serverVerdict: null }),
    );

    expect(authorization).toMatchObject({
      allowed: false,
      code: 'SERVER_VERDICT_MISSING',
    });
  });

  it('refuses an unreadable verdict', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({
        serverVerdict: { allowed: null, reasonCode: null, reason: null },
      }),
    );

    expect(authorization).toMatchObject({
      allowed: false,
      code: 'SERVER_VERDICT_UNREADABLE',
    });
  });

  it("carries the server's own refusal code and sentence", () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({
        serverVerdict: {
          allowed: false,
          reasonCode: 'SENDER_IDENTITY_NOT_AUTHORIZED',
          reason: 'This mailbox is not delegated to the workspace.',
        },
      }),
    );

    expect(authorization).toEqual({
      allowed: false,
      code: 'SERVER_REFUSED',
      serverReasonCode: 'SENDER_IDENTITY_NOT_AUTHORIZED',
      serverReason: 'This mailbox is not delegated to the workspace.',
    });
  });

  // The reader may only narrow what the server granted. It never widens it.
  it('never allows an identity the server refused, whatever the rest says', () => {
    const authorization = readSenderIdentityAuthorization(
      buildIdentity({
        state: 'verified',
        serverVerdict: {
          allowed: false,
          reasonCode: 'QUOTA_EXCEEDED',
          reason: null,
        },
      }),
    );

    expect(authorization.allowed).toBe(false);
  });

  it('ignores case and surrounding spaces when matching addresses', () => {
    expect(
      readSenderIdentityAuthorization(
        buildIdentity({
          displayedAddress: '  Devis@Atelier-Fontaine.FR ',
          replyToAddress: 'CONTACT@atelier-fontaine.fr',
        }),
      ),
    ).toEqual({ allowed: true });
  });

  it('refuses an identity with no displayed address', () => {
    expect(
      readSenderIdentityAuthorization(
        buildIdentity({ displayedAddress: '   ' }),
      ),
    ).toMatchObject({
      allowed: false,
      code: 'DISPLAYED_ADDRESS_MISSING',
    });
  });
});
