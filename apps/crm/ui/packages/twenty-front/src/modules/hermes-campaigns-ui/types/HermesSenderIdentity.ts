// A sender identity as published by the server. The domain, the displayed
// address, the connection login and the delegated mailbox are four separate
// fields, and only the last grants a right to send. Nothing is derived from
// another field: what the server did not publish stays null, and a null is
// never read as a permission.

export type HermesSenderIdentityState = 'verified' | 'unverified' | 'revoked';

export type HermesDelegatedMailbox = {
  // Human label of the mailbox, as the connection screen names it.
  label: string | null;
  // The mailbox address the delegation was actually granted on. It is not the
  // displayed address and not the login.
  address: string | null;
  // true only when the server attested the delegation. false when it attested
  // the opposite. null when it published nothing readable — which is not a
  // delegation either.
  delegated: boolean | null;
  // When the delegation was last attested, as published (ISO 8601 expected).
  attestedAt: string | null;
  // The server's own sentence about the proof, when it published one.
  proof: string | null;
};

// The verdict the server itself reached on this identity. The interface may
// refuse an identity the server allowed, never the other way round.
export type HermesSenderIdentityVerdict = {
  allowed: boolean | null;
  reasonCode: string | null;
  reason: string | null;
};

export type HermesSenderIdentity = {
  id: string;
  // The address a recipient sees in the From header.
  displayedAddress: string | null;
  // The domain as published. Never parsed out of the displayed address: a
  // guessed domain would be a fact the server never stated.
  domain: string | null;
  // The identifier used to authenticate to the transport, for display only.
  // Never a secret, never an authorisation.
  connectionLogin: string | null;
  // The mailbox the delegation actually covers.
  delegatedMailbox: HermesDelegatedMailbox | null;
  // Aliases explicitly authorised for this identity. An address outside this
  // list is refused even inside the right domain.
  authorizedAliases: string[];
  // Where replies go, as published.
  replyToAddress: string | null;
  // Null when the published state was not one of the three in the contract.
  state: HermesSenderIdentityState | null;
  // The raw state string when it fell outside the contract, so the screen can
  // name what it received instead of inventing a state.
  unknownState: string | null;
  // Null when the server published no verdict for this identity.
  serverVerdict: HermesSenderIdentityVerdict | null;
};
