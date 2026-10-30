import { isDefined } from 'kovaa-lab-shared/utils';

import {
  isHermesConnectionState,
  type HermesConnection,
} from '@/hermes-admin-ui/types/HermesConnection';
import {
  HERMES_UI_KIND_BY_RUNTIME_KIND,
  isHermesRuntimeConnectionKind,
  type HermesRuntimeConnectionKind,
} from '@/hermes-admin-runtime/types/HermesRuntimeConnectionKind';

// One view as it comes off the wire, before anything is believed about it.
const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

// A revision is an Int on the wire and is carried as a string through the UI
// types. It is read, never built: a value that is not an integer is no
// revision at all, and the screen would rather send nothing than send a
// number it made up. 0 is a real revision (the first-ever save) and must
// survive this, so emptiness is not tested by falsiness.
export const readHermesRevision = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return String(value);
  }

  // A string that is exactly an integer is accepted; anything else is not.
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return String(Number.parseInt(value.trim(), 10));
  }

  return null;
};

// The number the mutation needs back. Returns null when what was read is not
// an integer, which stops the write rather than repairing the value.
export const toHermesExpectedRevision = (
  revision: string | null,
): number | null => {
  if (revision === null || !/^-?\d+$/.test(revision.trim())) {
    return null;
  }

  return Number.parseInt(revision.trim(), 10);
};

// Whether a secret is stored, from the FIELD NAMES the server listed. No value
// is involved: `secretFields` never carries one, so nothing here could echo a
// secret even by accident. An unreadable list stays null — « unknown » — which
// the library keeps apart from « no secret stored ».
const readHasStoredSecret = (value: unknown): boolean | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.some((entry) => readString(entry) !== null);
};

// The server's own name for a connection, taken from its settings. Never a
// secret, and never derived from one.
const readLabel = (
  runtimeKind: HermesRuntimeConnectionKind,
  settings: Record<string, unknown> | null,
): string | null => {
  if (settings === null) {
    return null;
  }

  switch (runtimeKind) {
    case 'EVOLUTION':
      return readString(settings.instanceName);
    // The normalized handle the SERVER attaches to the bound native account.
    // `mailbox` is deliberately not used as the label: it is an IMAP folder,
    // typically INBOX, and showing it as the connection's name would read as
    // an address.
    case 'MAIL':
      return readString(settings.handle);
    case 'MCP':
      return readString(settings.toolName);
    default:
      return null;
  }
};

const readProtocol = (
  runtimeKind: HermesRuntimeConnectionKind,
  settings: Record<string, unknown> | null,
): string | null =>
  runtimeKind === 'MCP' && settings !== null
    ? readString(settings.protocolVersion)
    : null;

export type HermesRuntimeConnectionView = {
  runtimeKind: HermesRuntimeConnectionKind | null;
  unknownKind: string | null;
  // Present for every view, configured or not: recreating after a removal
  // needs the tombstone revision, not 0, so the revision of a
  // NOT_CONFIGURED slot is kept rather than dropped.
  revision: string | null;
  state: string | null;
  settings: Record<string, unknown> | null;
  // Null only when the server reported no connection at all for the kind.
  connection: HermesConnection | null;
};

export type HermesConnectionsV4Read = {
  views: readonly HermesRuntimeConnectionView[];
  connections: readonly HermesConnection[];
  unreadableEntryCount: number;
};

// Turns the published views into what the settings centre reads.
//
// `companyId` is the active operating company: the query is scoped to the
// authenticated session's workspace, so every view it returns belongs to that
// company, and stamping it lets the centre prove a setting does not reach
// another one. It is never taken from the payload.
//
// Three things are deliberately NOT done here:
// - no capability is reported, because the contract publishes none. Every
//   expected capability therefore reads as unconfirmed, which is the truth.
// - `verifiedAt` stays null, because no verification exists in this contract.
//   Nothing read here can be shown as connected.
// - a NOT_CONFIGURED view becomes no connection at all, so the centre shows
//   its own « Non configuré » slot instead of a record the server never sent.
export const readHermesConnectionsV4Payload = (
  payload: unknown,
  companyId: string | null,
): HermesConnectionsV4Read => {
  if (!Array.isArray(payload)) {
    return { views: [], connections: [], unreadableEntryCount: 0 };
  }

  const views: HermesRuntimeConnectionView[] = [];
  let unreadableEntryCount = 0;

  for (const entry of payload) {
    const record = readRecord(entry);

    if (record === null) {
      unreadableEntryCount += 1;
      continue;
    }

    const rawKind = readString(record.kind);
    const runtimeKind = isHermesRuntimeConnectionKind(rawKind) ? rawKind : null;
    const revision = readHermesRevision(record.revision);
    const rawState = readString(record.state);
    const settings = readRecord(record.settings);
    const connectionId = readString(record.connectionId);

    // An entry whose kind cannot be read at all is counted, not guessed at.
    if (rawKind === null) {
      unreadableEntryCount += 1;
      continue;
    }

    const isConfigured = rawState !== 'NOT_CONFIGURED';

    const connection: HermesConnection | null =
      isConfigured && connectionId !== null && companyId !== null
        ? {
            id: connectionId,
            companyId,
            kind:
              runtimeKind === null
                ? null
                : HERMES_UI_KIND_BY_RUNTIME_KIND[runtimeKind],
            unknownKind: runtimeKind === null ? rawKind : null,
            label: runtimeKind === null ? null : readLabel(runtimeKind, settings),
            protocol:
              runtimeKind === null ? null : readProtocol(runtimeKind, settings),
            state: isHermesConnectionState(rawState) ? rawState : null,
            unknownState: isHermesConnectionState(rawState) ? null : rawState,
            // No verification exists in this contract, so there is no date
            // that could present this connection as connected.
            verifiedAt: null,
            errorCode: null,
            disabledBy: null,
            disabledAt: null,
            hasStoredSecret: readHasStoredSecret(record.secretFields),
            // The contract reports no capability. An empty list makes every
            // expected capability read as unconfirmed, therefore unavailable.
            capabilities: [],
            revision,
          }
        : null;

    views.push({
      runtimeKind,
      unknownKind: runtimeKind === null ? rawKind : null,
      revision,
      state: rawState,
      settings,
      connection,
    });
  }

  return {
    views,
    connections: views
      .map((view) => view.connection)
      .filter((connection): connection is HermesConnection =>
        isDefined(connection),
      ),
    unreadableEntryCount,
  };
};
