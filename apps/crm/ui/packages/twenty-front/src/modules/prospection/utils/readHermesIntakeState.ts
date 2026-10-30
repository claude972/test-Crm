import {
  type HermesIntakeEndpoint,
  type HermesIntakeReadState,
} from '@/prospection/types/HermesIntakeState';

// hermesIntakeState is a typed DTO, but it is still read defensively: a field
// the deployed server stops sending, or a status outside the three published
// values, must become an honest unknown rather than a guessed reading.
//
// The three published statuses are NOT_CONFIGURED, CONFIGURED_UNVERIFIED and
// CONFIGURATION_ERROR. Note what is absent: there is no "available" and no
// "verified". CONFIGURED_UNVERIFIED is the best the server can say, so nothing
// here may read as a confirmed, working entry point.
const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const readEndpoint = (value: unknown): HermesIntakeEndpoint | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  return {
    connectionId: readString(value.connectionId),
    structureId: readString(value.structureId),
    structureName: readString(value.structureName),
    label: readString(value.label),
    // Never defaulted to true: an unstated capability is unknown.
    isAccepting: readBoolean(value.isAccepting),
    lastCollectionAt: readString(value.lastCollectionAt),
    providerState: readString(value.providerState),
    errorCode: readString(value.errorCode),
  };
};

export const readHermesIntakeState = (
  value: unknown,
): HermesIntakeReadState => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const status = readString(value.status);

  if (status === 'NOT_CONFIGURED') {
    return { kind: 'not-configured' };
  }

  if (!Array.isArray(value.endpoints)) {
    return { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  // A status outside the three published values is not read as configured.
  if (status !== 'CONFIGURED_UNVERIFIED' && status !== 'CONFIGURATION_ERROR') {
    return { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  const endpoints = value.endpoints
    .map(readEndpoint)
    .filter((endpoint): endpoint is HermesIntakeEndpoint => endpoint !== null);

  return { kind: 'reported', endpoints };
};
