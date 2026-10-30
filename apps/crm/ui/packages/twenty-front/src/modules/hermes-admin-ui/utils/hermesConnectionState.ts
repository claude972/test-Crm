import { isNonEmptyString } from '@sniptt/guards';

import { type HermesConnection } from '@/hermes-admin-ui/types/HermesConnection';
import { parseHermesInstant } from '@/hermes-admin-ui/utils/parseHermesInstant';

// The state of one connection, reduced to what may be said about it.
// « Configuré » is not « connecté »: a connection is connected only when a
// verification happened AND carries its date. A VERIFIED state without a
// readable date therefore comes back as CONFIGURED_UNVERIFIED, because
// « vérifié le … » with no date after it is a claim nobody made.
export type HermesConnectionStateDescriptor =
  | { kind: 'NOT_CONFIGURED' }
  | { kind: 'CONFIGURED_UNVERIFIED' }
  | { kind: 'VERIFIED'; verifiedAt: Date }
  | { kind: 'ERROR'; errorCode: string | null }
  | { kind: 'DISABLED'; disabledBy: string | null; disabledAt: Date | null }
  | { kind: 'UNKNOWN'; reported: string | null };

// A string the server sent that is only whitespace is not a value: showing
// « Motif : "   " » would be worse than saying nothing was given.
const readReportedText = (value: string | null): string | null => {
  const trimmed = value?.trim();

  return isNonEmptyString(trimmed) ? trimmed : null;
};

type HermesConnectionStateInput = Pick<
  HermesConnection,
  'state' | 'unknownState' | 'verifiedAt' | 'errorCode' | 'disabledBy' | 'disabledAt'
>;

export const readHermesConnectionStateDescriptor = (
  connection: HermesConnectionStateInput,
): HermesConnectionStateDescriptor => {
  // A state outside the published five is kept verbatim. Mapping it onto one
  // of the five would show a state the server never sent.
  if (connection.state === null) {
    return {
      kind: 'UNKNOWN',
      reported: readReportedText(connection.unknownState),
    };
  }

  if (connection.state === 'NOT_CONFIGURED') {
    return { kind: 'NOT_CONFIGURED' };
  }

  if (connection.state === 'CONFIGURED_UNVERIFIED') {
    return { kind: 'CONFIGURED_UNVERIFIED' };
  }

  if (connection.state === 'ERROR') {
    return {
      kind: 'ERROR',
      errorCode: readReportedText(connection.errorCode),
    };
  }

  // An administrator's decision, which is not an error and not a bot that was
  // switched off. Who and when are kept when the server gave them, because a
  // decision has an author.
  if (connection.state === 'DISABLED') {
    const disabledAt = parseHermesInstant(connection.disabledAt);

    return {
      kind: 'DISABLED',
      disabledBy: readReportedText(connection.disabledBy),
      disabledAt: disabledAt.kind === 'at' ? disabledAt.date : null,
    };
  }

  const verifiedAt = parseHermesInstant(connection.verifiedAt);

  // Verified, but with nothing to date it by. Not connected.
  if (verifiedAt.kind !== 'at') {
    return { kind: 'CONFIGURED_UNVERIFIED' };
  }

  return { kind: 'VERIFIED', verifiedAt: verifiedAt.date };
};

// The five published labels, supplied by the component so the wording stays in
// the translation macros and this function stays testable. `verifiedAt` is a
// function rather than a string with a placeholder: the date is formatted in
// the caller's locale, and the label is built around it.
export type HermesConnectionStateLabels = {
  notConfigured: string;
  configuredUnverified: string;
  verifiedAt: (formattedDate: string) => string;
  error: string;
  disabled: string;
  unknown: string;
};

export const formatHermesConnectionStateLabel = (
  descriptor: HermesConnectionStateDescriptor,
  labels: HermesConnectionStateLabels,
  formatDate: (date: Date) => string,
): string => {
  switch (descriptor.kind) {
    case 'NOT_CONFIGURED':
      return labels.notConfigured;
    case 'CONFIGURED_UNVERIFIED':
      return labels.configuredUnverified;
    case 'VERIFIED':
      return labels.verifiedAt(formatDate(descriptor.verifiedAt));
    case 'ERROR':
      return labels.error;
    case 'DISABLED':
      return labels.disabled;
    case 'UNKNOWN':
      return labels.unknown;
  }
};

// Whether the operator may act on this connection at all.
//
// A disabled connection is an administrator's decision, so it is not edited
// from here without that decision being reversed first; an unknown state is
// not a licence to write over something nobody read.
export const isHermesConnectionEditable = (
  descriptor: HermesConnectionStateDescriptor,
): boolean => descriptor.kind !== 'UNKNOWN' && descriptor.kind !== 'DISABLED';

// Whether a test may be asked for. A connection with nothing configured has
// nothing to test, and an unknown state means the read itself failed.
export const isHermesConnectionTestable = (
  descriptor: HermesConnectionStateDescriptor,
): boolean =>
  descriptor.kind === 'CONFIGURED_UNVERIFIED' ||
  descriptor.kind === 'VERIFIED' ||
  descriptor.kind === 'ERROR';
