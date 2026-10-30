import {
  isHermesBotPolicyMode,
  isHermesBotPolicyScope,
  type HermesBotPolicy,
  type HermesBotPolicyPayloadRead,
} from '@/hermes-bot-settings/types/HermesBotPolicy';

// The bot policy operations are not in the generated schema, and the contract
// states that scope, mode and revision all travel as Strings — so even a typed
// DTO would carry vocabularies this client cannot assume are closed.
//
// Everything below reduces the answer field by field: a field that is absent
// or of the wrong type becomes null, a value outside a published set is kept
// verbatim as unknown, and a payload whose shape does not match the contract
// becomes 'unreadable' — never an empty list, which would read as "no policy".

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

// One scope's policy.
//
// An entry with neither a known scope nor a readable scope string cannot be
// labelled or written to, so it is not kept as a half-entry: callers count
// what they dropped.
export const readHermesBotPolicy = (
  value: unknown,
): HermesBotPolicy | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const rawScope = value.scope;
  const rawMode = value.mode;

  const scope = isHermesBotPolicyScope(rawScope) ? rawScope : null;
  const unknownScope = scope === null ? readString(rawScope) : null;

  if (scope === null && unknownScope === null) {
    return null;
  }

  return {
    scope,
    unknownScope,
    mode: isHermesBotPolicyMode(rawMode) ? rawMode : null,
    unknownMode: isHermesBotPolicyMode(rawMode) ? null : readString(rawMode),
    // The revision is opaque. It is carried back untouched as
    // expectedRevision, and never parsed, padded or constructed here.
    revision: readString(value.revision),
  };
};

export type HermesBotPolicyListValue = {
  policies: HermesBotPolicy[];
  unreadableEntryCount: number;
};

export const readHermesBotPolicyList = (
  value: unknown,
): HermesBotPolicyPayloadRead<HermesBotPolicyListValue> => {
  if (!Array.isArray(value)) {
    return {
      kind: 'unreadable',
      problem: value === null || value === undefined ? 'missing' : 'malformed',
    };
  }

  const entries = value.map((entry) => readHermesBotPolicy(entry));

  return {
    kind: 'read',
    value: {
      policies: entries.filter(
        (entry): entry is HermesBotPolicy => entry !== null,
      ),
      unreadableEntryCount: entries.filter((entry) => entry === null).length,
    },
  };
};

// The write answers with one scope's policy. A payload without a readable
// scope is not a success: the request did leave, but the client does not know
// what the server made of it, so the outcome is unconfirmed — never a save.
export const readHermesBotPolicyWriteResult = (
  value: unknown,
): HermesBotPolicyPayloadRead<HermesBotPolicy> => {
  if (value === undefined || value === null) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const policy = readHermesBotPolicy(value);

  return policy === null
    ? { kind: 'unreadable', problem: 'malformed' }
    : { kind: 'read', value: policy };
};
