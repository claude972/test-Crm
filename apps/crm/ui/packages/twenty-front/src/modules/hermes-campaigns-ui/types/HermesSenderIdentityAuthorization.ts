// Why an identity is refused, as a code rather than as a sentence: the rule
// lives in the reader, the wording lives in the component that renders it.
export type HermesSenderIdentityRefusalCode =
  // The server published no verdict at all. Unverified is unavailable.
  | 'SERVER_VERDICT_MISSING'
  // The server published a verdict that was not a readable boolean.
  | 'SERVER_VERDICT_UNREADABLE'
  // The server refused it. Its own code and sentence travel alongside.
  | 'SERVER_REFUSED'
  // The published state was outside the three states of the contract.
  | 'IDENTITY_STATE_UNKNOWN'
  | 'IDENTITY_REVOKED'
  | 'IDENTITY_NOT_VERIFIED'
  // The right domain is not a delegation: this is the refusal that case gets.
  | 'MAILBOX_NOT_DELEGATED'
  | 'MAILBOX_DELEGATION_UNKNOWN'
  | 'DISPLAYED_ADDRESS_MISSING'
  // Inside the right domain, but neither the delegated mailbox nor one of the
  // explicitly authorised aliases.
  | 'DISPLAYED_ADDRESS_NOT_AUTHORIZED'
  | 'REPLY_TO_NOT_AUTHORIZED';

export type HermesSenderIdentityAuthorization =
  | { allowed: true }
  | {
      allowed: false;
      code: HermesSenderIdentityRefusalCode;
      // The server's own code and sentence, when the refusal came from it.
      serverReasonCode: string | null;
      serverReason: string | null;
    };
