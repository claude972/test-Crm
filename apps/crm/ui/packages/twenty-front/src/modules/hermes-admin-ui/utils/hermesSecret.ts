// Everything this module knows how to do with a secret: not show it, not read
// it back, not describe it by its contents. No function here takes a stored
// secret as an argument — the browser never receives one, so none of this
// code could echo one even by mistake.

// A fixed mask. Its length carries no information about any secret, because no
// secret is involved in producing it.
export const HERMES_SECRET_MASK = '••••••••';

// What is known about the stored secret of one connection.
//
// 'unknown' is a server that did not say. It is kept apart from 'absent': an
// unknown secret must not be presented as « aucun secret enregistré », which
// would invite the operator to type one in where one may already exist.
export type HermesSecretFieldRead =
  | { kind: 'absent' }
  | { kind: 'stored' }
  | { kind: 'unknown' };

export const readHermesSecretField = (
  hasStoredSecret: boolean | null | undefined,
): HermesSecretFieldRead => {
  if (hasStoredSecret === true) {
    return { kind: 'stored' };
  }

  if (hasStoredSecret === false) {
    return { kind: 'absent' };
  }

  return { kind: 'unknown' };
};

// The placeholder shown in the empty secret field. It is the mask when
// something is stored, and nothing otherwise — never a value, never a length,
// never a prefix or a suffix of a secret.
export const hermesSecretPlaceholder = (read: HermesSecretFieldRead): string =>
  read.kind === 'stored' ? HERMES_SECRET_MASK : '';

// What the secret control sends when the form is submitted.
//
// 'unchanged' means the field was left as it was found, so nothing about the
// secret is put in the submission at all and the server keeps what it holds.
export type HermesSecretSubmission =
  | { kind: 'unchanged' }
  | { kind: 'replaced'; value: string };

export const buildHermesSecretSubmission = (
  typed: string,
): HermesSecretSubmission =>
  // Compared against the empty string exactly. A secret is not trimmed,
  // normalised or otherwise rewritten on its way out: leading and trailing
  // characters can be part of it.
  typed === '' ? { kind: 'unchanged' } : { kind: 'replaced', value: typed };

// How a submission may be described in a note, a live region or a log. It
// returns a decision, never the value, and it is the only description this
// module offers — so there is no path from a submission to its contents
// outside the submission itself.
export const describeHermesSecretSubmission = (
  submission: HermesSecretSubmission,
): 'unchanged' | 'replaced' => submission.kind;
