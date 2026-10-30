import { isNonEmptyString } from '@sniptt/guards';

import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';
import {
  type HermesConnectionFormField,
  type HermesConnectionFormSubject,
  type HermesConnectionFormValues,
  type HermesConnectionSecretPolicy,
  type HermesNativeConnectedAccount,
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

// E-mail runs on the native connected account, already encrypted and the only
// store there is. No mailbox password field is ever offered for it.
export const readHermesConnectionSecretPolicy = (
  kind: HermesConnectionKind | null,
): HermesConnectionSecretPolicy => {
  if (kind === null) {
    return { kind: 'unknown' };
  }

  if (kind === 'EMAIL_IMAP' || kind === 'EMAIL_SMTP') {
    return { kind: 'native-account' };
  }

  return { kind: 'own-secret' };
};

export const hasHermesOwnSecretField = (
  policy: HermesConnectionSecretPolicy,
): boolean => policy.kind === 'own-secret';

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

// An e-mail link has exactly three elements: the chosen native connected
// account, the IMAP reception folder, and the address the server attaches to
// that account. Only the first two are inputs, so only those can be missing.
export const validateHermesConnectionForm = (
  policy: HermesConnectionSecretPolicy,
  values: HermesConnectionFormValues,
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

  if (values.label.trim() === '') {
    issues.label = 'required';
  }

  if (values.endpoint.trim() === '') {
    issues.endpoint = 'required';
  }

  return issues;
};

// The address the server attaches to the chosen account. Never derived from
// the id, never guessed: an account nobody listed has no address here.
export const readHermesNativeAccountAddress = (
  accounts: readonly HermesNativeConnectedAccount[],
  accountId: string,
): string | null =>
  accounts.find((account) => account.id === accountId)?.address ?? null;
