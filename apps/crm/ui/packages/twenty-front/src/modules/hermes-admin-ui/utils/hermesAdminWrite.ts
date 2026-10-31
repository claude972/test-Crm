import { isNonEmptyString } from '@sniptt/guards';

import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';
import {
  type HermesConnectionFormField,
  type HermesConnectionFormSubject,
  type HermesConnectionFormValues,
  type HermesConnectionSecretPolicy,
  type HermesNativeConnectedAccount,
  type HermesSecretField,
} from '@/hermes-admin-ui/types/HermesConnectionForm';

export const isHermesAdminContextCurrent = (
  validity: HermesAdminContextValidity,
): boolean => validity.kind === 'current';

// A result that arrived for the previous company is dropped, not shown:
// keeping it would attribute one company's state to another.
export const shouldDiscardHermesResult = (
  validity: HermesAdminContextValidity,
): boolean => validity.kind === 'stale';

// A stale context is no licence to write: the company header the parent would
// send is no longer the one the screen was read against.
export const canWriteInHermesAdminContext = (
  validity: HermesAdminContextValidity,
): boolean => validity.kind === 'current';

// The backend's named « session remplacée ». It is a settled answer, so it is
// met by a reload the operator asks for, never by a retry started here.
export const isHermesSessionReplaced = (
  validity: HermesAdminContextValidity,
): boolean =>
  validity.kind === 'stale' && validity.reason === 'session-replaced';

// Which secrets each kind stores, under the server's own field names.
//
// E-mail runs on the native connected account, already encrypted and the only
// store there is, so no mailbox password field is ever offered for it.
export const readHermesConnectionSecretPolicy = (
  kind: HermesConnectionKind | null,
): HermesConnectionSecretPolicy => {
  if (kind === null) {
    return { kind: 'unknown' };
  }

  if (kind === 'EMAIL_IMAP' || kind === 'EMAIL_SMTP') {
    return { kind: 'native-account' };
  }

  // Two distinct secrets, replaced together: supplying one would erase the
  // other, and the webhook secret must differ from the API key.
  if (kind === 'WHATSAPP_EVOLUTION') {
    return { kind: 'own-secret', fields: ['apiKey', 'webhookSecret'] };
  }

  // FORMS and APPOINTMENTS are `allowedSources` INSIDE the one signed
  // collection record, not records of their own, so neither is configured
  // separately and neither gets a secret control.
  if (kind === 'SIGNED_INTAKE') {
    return { kind: 'own-secret', fields: ['secret'] };
  }

  if (kind === 'FORMS' || kind === 'APPOINTMENTS') {
    return { kind: 'unknown' };
  }

  return { kind: 'own-secret', fields: ['token'] };
};

export const hasHermesOwnSecretField = (
  policy: HermesConnectionSecretPolicy,
): boolean => policy.kind === 'own-secret';

export const readHermesSecretFields = (
  policy: HermesConnectionSecretPolicy,
): readonly HermesSecretField[] =>
  policy.kind === 'own-secret' ? policy.fields : [];

// Whether a save or a delete may be attempted, and why not when it may not.
// Both reasons leave the server untouched: a missing revision could overwrite
// someone else's decision, and a stale context would write under the wrong
// company header.
export type HermesConnectionWriteGate =
  | { kind: 'sendable'; expectedRevision: string | null }
  | { kind: 'not-sent'; reason: 'missing-revision' | 'stale-context' };

export const readHermesConnectionWriteGate = (
  subject: HermesConnectionFormSubject,
  validity: HermesAdminContextValidity,
): HermesConnectionWriteGate => {
  if (!canWriteInHermesAdminContext(validity)) {
    return { kind: 'not-sent', reason: 'stale-context' };
  }

  // A create has nothing to be stale against, so it carries no revision.
  if (subject.mode === 'create') {
    return { kind: 'sendable', expectedRevision: null };
  }

  // Trimmed on the check only: a blank string is not a revision. The value
  // itself is echoed back exactly as read, never repaired.
  if (!isNonEmptyString(subject.revision?.trim())) {
    return { kind: 'not-sent', reason: 'missing-revision' };
  }

  return { kind: 'sendable', expectedRevision: subject.revision };
};

// What a form is missing, as codes rather than sentences, so the wording stays
// in the translation macros and this rule stays testable.
export type HermesConnectionFormIssues = Partial<
  Record<HermesConnectionFormField, 'required'>
>;

// What a form is missing. The server's own validator stays the one of record;
// these checks only stop a write that could not possibly be valid.
export const validateHermesConnectionForm = (
  policy: HermesConnectionSecretPolicy,
  values: HermesConnectionFormValues,
  kind: HermesConnectionKind | null,
): HermesConnectionFormIssues => {
  const issues: HermesConnectionFormIssues = {};

  if (policy.kind === 'native-account') {
    if (values.nativeAccountId.trim() === '') {
      issues.nativeAccountId = 'required';
    }

    if (values.imapFolder.trim() === '') {
      issues.imapFolder = 'required';
    }

    return issues;
  }

  // A signed collection has no endpoint and no name of its own: it is an
  // endpoint others call. What it needs is its ingress policy.
  if (kind === 'SIGNED_INTAKE') {
    if (values.allowedSources.length === 0) {
      issues.allowedSources = 'required';
    }

    const rate = Number(values.maxRequestsPerMinute.trim());

    if (
      values.maxRequestsPerMinute.trim() === '' ||
      !Number.isInteger(rate) ||
      rate < 1 ||
      rate > 60
    ) {
      issues.maxRequestsPerMinute = 'required';
    }

    return issues;
  }

  if (values.label.trim() === '') {
    issues.label = 'required';
  }

  if (values.endpoint.trim() === '') {
    issues.endpoint = 'required';
  }

  return issues;
};

// Whether the typed secrets may be sent.
//
// Supplying the secret object replaces the COMPLETE set, so a kind wanting
// two secrets sends both or neither. One filled field out of two is refused
// before anything leaves: sending it would erase the other.
export type HermesSecretEntryCheck =
  | { kind: 'unchanged' }
  | { kind: 'complete' }
  | { kind: 'partial'; missing: readonly HermesSecretField[] };

export const checkHermesSecretEntry = (
  fields: readonly HermesSecretField[],
  typed: Readonly<Partial<Record<HermesSecretField, string>>>,
): HermesSecretEntryCheck => {
  // Compared against the empty string exactly: a secret is never trimmed, so
  // leading and trailing characters can be part of it.
  const filled = fields.filter((field) => (typed[field] ?? '') !== '');

  if (filled.length === 0) {
    return { kind: 'unchanged' };
  }

  const missing = fields.filter((field) => (typed[field] ?? '') === '');

  return missing.length === 0 ? { kind: 'complete' } : { kind: 'partial', missing };
};

// The address the server attaches to the chosen account. Never derived from
// the id, never guessed: an account nobody listed has no address here.
export const readHermesNativeAccountAddress = (
  accounts: readonly HermesNativeConnectedAccount[],
  accountId: string,
): string | null =>
  accounts.find((account) => account.id === accountId)?.address ?? null;
