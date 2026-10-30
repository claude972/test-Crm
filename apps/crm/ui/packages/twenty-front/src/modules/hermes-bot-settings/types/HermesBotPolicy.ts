// The workspace-level bot policy, as the V3 contract publishes it.
//
// `scope`, `mode` and `revision` are Strings on the wire, not GraphQL enums,
// so a value this client does not know reaches the screen intact instead of
// breaking the read or being folded into a value the server never sent.

// The three scopes published today: the company-wide policy, and one per
// channel.
export const HERMES_BOT_POLICY_SCOPES = [
  'WORKSPACE',
  'WHATSAPP',
  'EMAIL',
] as const;

export type HermesBotPolicyScope = (typeof HERMES_BOT_POLICY_SCOPES)[number];

export const isHermesBotPolicyScope = (
  value: unknown,
): value is HermesBotPolicyScope =>
  typeof value === 'string' &&
  (HERMES_BOT_POLICY_SCOPES as readonly string[]).includes(value);

// The modes a read can report.
//
// INHERIT is not a mode the bot runs in: it says the channel has no policy of
// its own and follows the company-wide one. Only a channel can report it.
export const HERMES_BOT_POLICY_MODES = [
  'INHERIT',
  'AUTO',
  'ASSISTED',
  'OFF',
] as const;

export type HermesBotPolicyMode = (typeof HERMES_BOT_POLICY_MODES)[number];

export const isHermesBotPolicyMode = (
  value: unknown,
): value is HermesBotPolicyMode =>
  typeof value === 'string' &&
  (HERMES_BOT_POLICY_MODES as readonly string[]).includes(value);

// The modes this screen may ask for.
//
// AUTO      the bot may reply on its own.
// ASSISTED  the bot prepares a draft; nothing leaves without a human click.
// OFF       no draft and no call to the bot at all. Messages still arrive and
//           a human can still reply.
//
// INHERIT is deliberately absent: it is a read answer here, not a request this
// screen makes.
export const HERMES_BOT_POLICY_WRITE_MODES = [
  'AUTO',
  'ASSISTED',
  'OFF',
] as const;

export type HermesBotPolicyWriteMode =
  (typeof HERMES_BOT_POLICY_WRITE_MODES)[number];

// One scope's policy as the server reported it.
//
// A scope or a mode outside the published sets is kept verbatim in its
// `unknown*` field rather than dropped or mapped: the screen can then say it
// does not recognise the value, which is honest, instead of showing one the
// server never sent.
//
// `revision` is what makes a write refusable: it is sent back untouched as
// `expectedRevision`, never built or repaired here.
export type HermesBotPolicy = {
  scope: HermesBotPolicyScope | null;
  unknownScope: string | null;
  mode: HermesBotPolicyMode | null;
  unknownMode: string | null;
  revision: string | null;
};

export type HermesBotPolicyPayloadRead<TValue> =
  | { kind: 'read'; value: TValue }
  | { kind: 'unreadable'; problem: 'missing' | 'malformed' };

// What the screen knows about the policies.
//
// 'unknown' is a failed or unreadable read. It is not an absence of policy and
// it is never shown as a mode: no default is displayed in its place.
export type HermesBotPoliciesRead =
  | { kind: 'loading' }
  | { kind: 'unknown' }
  | {
      kind: 'reported';
      policies: HermesBotPolicy[];
      // Entries the reader could not make sense of at all. Counted so the
      // screen can say something was dropped instead of pretending the list
      // was complete.
      unreadableEntryCount: number;
    };
