import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';

// The four kinds the central store publishes. They are NOT the seven
// product-level slots the settings centre names, and the two sets are not
// folded into one another: a slot nobody can configure server-side is said to
// be unconfigurable rather than shown as configurable and failing on submit.
export const HERMES_RUNTIME_CONNECTION_KINDS = [
  'EVOLUTION',
  'MAIL',
  'MCP',
  'INTAKE',
] as const;

export type HermesRuntimeConnectionKind =
  (typeof HERMES_RUNTIME_CONNECTION_KINDS)[number];

export const isHermesRuntimeConnectionKind = (
  value: unknown,
): value is HermesRuntimeConnectionKind =>
  typeof value === 'string' &&
  (HERMES_RUNTIME_CONNECTION_KINDS as readonly string[]).includes(value);

// How one published kind shows up in the settings centre.
//
// MAIL binds a native connected account whose IMAP polling folder is the one
// setting, so it lands on the incoming-mail slot. EMAIL_SMTP has no record of
// its own: the native connected account owns the SMTP credentials, and a
// second store of ours is exactly what the contract forbids. FORMS and
// APPOINTMENTS are `allowedSources` INSIDE one INTAKE record, not records of
// their own, so neither maps to a kind here.
export const HERMES_RUNTIME_KIND_BY_UI_KIND: Partial<
  Record<HermesConnectionKind, HermesRuntimeConnectionKind>
> = {
  WHATSAPP_EVOLUTION: 'EVOLUTION',
  EMAIL_IMAP: 'MAIL',
  MCP: 'MCP',
  SIGNED_INTAKE: 'INTAKE',
};

export const HERMES_UI_KIND_BY_RUNTIME_KIND: Record<
  HermesRuntimeConnectionKind,
  HermesConnectionKind
> = {
  EVOLUTION: 'WHATSAPP_EVOLUTION',
  MAIL: 'EMAIL_IMAP',
  MCP: 'MCP',
  INTAKE: 'SIGNED_INTAKE',
};

// Whether a write can be built for one kind from the controls this screen
// actually has, and what is missing when it cannot.
//
// This is a statement about the FORM, not about the server's rights: the
// server would accept these writes from a screen that could compose them.
// Reporting it as a server refusal would blame the backend for a control this
// client does not offer, so it is kept apart and nothing is sent.
export type HermesRuntimeWriteSupport =
  | { kind: 'supported' }
  | { kind: 'no-server-kind' }
  | { kind: 'missing-control'; detail: 'evolution-two-secrets' | 'intake-settings' };

export const readHermesRuntimeWriteSupport = (
  uiKind: HermesConnectionKind | null,
): HermesRuntimeWriteSupport => {
  if (uiKind === null) {
    return { kind: 'no-server-kind' };
  }

  const runtimeKind = HERMES_RUNTIME_KIND_BY_UI_KIND[uiKind];

  if (runtimeKind === undefined) {
    return { kind: 'no-server-kind' };
  }

  // Every published kind the form can now compose. EVOLUTION has its two
  // distinct secret controls and INTAKE has its sources and its rate, so
  // neither is refused before sending any more. `missing-control` stays in
  // the type: it is what a future kind without controls would report.
  return { kind: 'supported' };
};
