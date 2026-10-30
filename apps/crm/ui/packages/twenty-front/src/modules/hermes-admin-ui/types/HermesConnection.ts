// What the Réglages screen knows about one operating company's connections.
//
// Everything here is what a server reported, or the honest absence of a
// report. Nothing is defaulted into existence: a field the server did not
// send stays null, and the screen says so rather than filling it in.

// The connections the connection centre asks about. These are product-level
// slots, not a server capability: the screen can name a slot nobody has
// configured yet, which is exactly how « Non configuré » gets shown.
export const HERMES_CONNECTION_KINDS = [
  'WHATSAPP_EVOLUTION',
  'EMAIL_IMAP',
  'EMAIL_SMTP',
  'MCP',
  'SIGNED_INTAKE',
  'FORMS',
  'APPOINTMENTS',
] as const;

export type HermesConnectionKind = (typeof HERMES_CONNECTION_KINDS)[number];

export const isHermesConnectionKind = (
  value: unknown,
): value is HermesConnectionKind =>
  typeof value === 'string' &&
  (HERMES_CONNECTION_KINDS as readonly string[]).includes(value);

// The five published connection states, as Strings on the wire.
// CONFIGURED_UNVERIFIED is NOT connected: credentials exist and nothing has
// confirmed them. Only VERIFIED, and only with a date, is connected.
// DISABLED is an administrator's decision about this connection, neither an
// error nor a bot switched off — those are other objects on other screens.
export const HERMES_CONNECTION_STATES = [
  'NOT_CONFIGURED',
  'CONFIGURED_UNVERIFIED',
  'VERIFIED',
  'ERROR',
  'DISABLED',
] as const;

export type HermesConnectionState = (typeof HERMES_CONNECTION_STATES)[number];

export const isHermesConnectionState = (
  value: unknown,
): value is HermesConnectionState =>
  typeof value === 'string' &&
  (HERMES_CONNECTION_STATES as readonly string[]).includes(value);

// The capabilities the screen asks about, one by one.
//
// A capability is never read off the state: a healthy connection can carry
// text only, and a configured one can carry nothing at all yet.
export const HERMES_CONNECTION_CAPABILITIES = [
  'RECEIVE',
  'SEND',
  'RECEIVE_MEDIA',
  'SEND_MEDIA',
  'VOICE',
  'RICH_EMAIL',
  'READ_ONLY_TOOLS',
  'SIGNED_PAYLOAD',
  'BOOKING',
] as const;

export type HermesConnectionCapability =
  (typeof HERMES_CONNECTION_CAPABILITIES)[number];

export const isHermesConnectionCapability = (
  value: unknown,
): value is HermesConnectionCapability =>
  typeof value === 'string' &&
  (HERMES_CONNECTION_CAPABILITIES as readonly string[]).includes(value);

// What the screen asks about for each kind of connection.
//
// A capability listed here that the server did not report is shown as not
// confirmed, therefore unavailable. Saying nothing would leave the operator to
// discover the limit by trying it.
export const HERMES_CONNECTION_EXPECTED_CAPABILITIES: Record<
  HermesConnectionKind,
  readonly HermesConnectionCapability[]
> = {
  WHATSAPP_EVOLUTION: [
    'RECEIVE',
    'SEND',
    'RECEIVE_MEDIA',
    'SEND_MEDIA',
    'VOICE',
  ],
  EMAIL_IMAP: ['RECEIVE', 'RECEIVE_MEDIA'],
  EMAIL_SMTP: ['SEND', 'SEND_MEDIA', 'RICH_EMAIL'],
  MCP: ['READ_ONLY_TOOLS'],
  SIGNED_INTAKE: ['RECEIVE', 'SIGNED_PAYLOAD'],
  FORMS: ['RECEIVE', 'SIGNED_PAYLOAD'],
  APPOINTMENTS: ['BOOKING'],
};

// One capability as the server reported it.
//
// `granted: null` is a capability the server mentioned without settling it. It
// is kept apart from a capability that was not mentioned at all, and neither
// one is ever shown as available.
export type HermesConnectionCapabilityReport = {
  capability: HermesConnectionCapability | null;
  unknownCapability: string | null;
  granted: boolean | null;
};

// One connection of one operating company. `companyId` is carried on purpose:
// the screen names the owning company, so a setting can be seen not to reach
// another one. `hasStoredSecret` says a secret exists server side; the secret
// itself is never part of this type, because it never reaches the browser.
export type HermesConnection = {
  id: string;
  companyId: string;
  kind: HermesConnectionKind | null;
  unknownKind: string | null;
  // The server's own name for this connection, e.g. the mailbox or instance.
  label: string | null;
  protocol: string | null;
  state: HermesConnectionState | null;
  unknownState: string | null;
  // The instant of the last successful verification, ISO 8601. Without it,
  // nothing may be presented as connected.
  verifiedAt: string | null;
  errorCode: string | null;
  // Who disabled it and when, for DISABLED. An administrator's decision has an
  // author; an error does not.
  disabledBy: string | null;
  disabledAt: string | null;
  hasStoredSecret: boolean | null;
  capabilities: readonly HermesConnectionCapabilityReport[];
  // What makes a write refusable. It is sent back untouched as the expected
  // revision, never built, repaired or defaulted here: without a revision that
  // was actually read, a save could overwrite someone else's decision, so
  // nothing is sent at all.
  revision: string | null;
};

// What the screen knows about the connection list.
//
// 'unknown' is a read that failed. It is not an empty list, and an empty list
// is not a failure: a company can genuinely have nothing configured.
export type HermesConnectionsRead =
  | { kind: 'loading' }
  | { kind: 'unknown'; message: string | null }
  | {
      kind: 'reported';
      connections: readonly HermesConnection[];
      // Entries that could not be read at all, counted so the screen can say
      // the list was shortened instead of pretending it was complete.
      unreadableEntryCount: number;
    };
