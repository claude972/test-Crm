import {
  HERMES_CONNECTION_EXPECTED_CAPABILITIES,
  type HermesConnection,
  type HermesConnectionCapability,
  type HermesConnectionCapabilityReport,
  type HermesConnectionKind,
} from '@/hermes-admin-ui/types/HermesConnection';
import { type HermesConnectionStateDescriptor } from '@/hermes-admin-ui/utils/hermesConnectionState';

// What may be said about one capability. 'unconfirmed' covers every case where
// nobody confirmed it: not mentioned, mentioned without an answer, or granted
// on a connection nothing has verified. The screen names it as unconfirmed and
// treats it as unavailable — granted on paper is not shown to work.
export type HermesCapabilityAvailability =
  | 'available'
  | 'unavailable'
  | 'unconfirmed';

// The single gate every control goes through. Nothing is offered unless this
// returns 'available'.
export const isHermesCapabilityUsable = (
  availability: HermesCapabilityAvailability,
): boolean => availability === 'available';

export const resolveHermesConnectionCapability = (
  descriptor: HermesConnectionStateDescriptor,
  report: HermesConnectionCapabilityReport | undefined,
): HermesCapabilityAvailability => {
  // Nothing configured, a failing connection, or an administrator's decision:
  // the capability cannot be used, whatever any flag says about it.
  if (
    descriptor.kind === 'NOT_CONFIGURED' ||
    descriptor.kind === 'ERROR' ||
    descriptor.kind === 'DISABLED'
  ) {
    return 'unavailable';
  }

  // A read that failed says nothing about the capability either.
  if (descriptor.kind === 'UNKNOWN') {
    return 'unconfirmed';
  }

  // Not reported at all, or reported without an answer.
  if (report === undefined || report.granted === null) {
    return 'unconfirmed';
  }

  if (report.granted === false) {
    return 'unavailable';
  }

  // Granted. Only a dated verification turns that into something usable.
  return descriptor.kind === 'VERIFIED' ? 'available' : 'unconfirmed';
};

// Every capability the screen asks about for this connection, resolved.
//
// The list is driven by the kind, not by the server's answer, so a capability
// the server left out still appears — as not confirmed. A kind this client
// does not know asks about nothing, because it has no idea what to ask.
export const resolveHermesConnectionCapabilities = (
  kind: HermesConnectionKind | null,
  descriptor: HermesConnectionStateDescriptor,
  reports: readonly HermesConnectionCapabilityReport[],
): readonly {
  capability: HermesConnectionCapability;
  availability: HermesCapabilityAvailability;
}[] => {
  if (kind === null) {
    return [];
  }

  return HERMES_CONNECTION_EXPECTED_CAPABILITIES[kind].map((capability) => ({
    capability,
    availability: resolveHermesConnectionCapability(
      descriptor,
      reports.find((report) => report.capability === capability),
    ),
  }));
};

// Capabilities the server reported that the screen does not ask about for this
// kind. They are listed verbatim instead of dropped: the operator should see
// that the server said something the screen cannot place.
export const readHermesUnexpectedCapabilityNames = (
  kind: HermesConnectionKind | null,
  reports: readonly HermesConnectionCapabilityReport[],
): readonly string[] => {
  const expected: readonly HermesConnectionCapability[] =
    kind === null ? [] : HERMES_CONNECTION_EXPECTED_CAPABILITIES[kind];

  return reports.flatMap((report) => {
    if (report.capability === null) {
      return report.unknownCapability === null ? [] : [report.unknownCapability];
    }

    return expected.includes(report.capability) ? [] : [report.capability];
  });
};

// Connections of one company only.
//
// Used so that a list rendered for the active company cannot show, or act on,
// another company's connection even if the parent handed over a mixed list.
export const filterHermesConnectionsByCompany = (
  connections: readonly HermesConnection[],
  companyId: string | null,
): readonly HermesConnection[] =>
  companyId === null
    ? []
    : connections.filter((connection) => connection.companyId === companyId);
