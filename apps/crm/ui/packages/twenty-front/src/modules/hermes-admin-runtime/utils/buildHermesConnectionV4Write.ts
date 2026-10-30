import { type HermesConnectionFormSubmission } from '@/hermes-admin-ui/types/HermesConnectionForm';
import { type HermesRuntimeConnectionKind } from '@/hermes-admin-runtime/types/HermesRuntimeConnectionKind';

export type HermesConnectionV4Write = {
  kind: HermesRuntimeConnectionKind;
  expectedRevision: number;
  settings: Record<string, unknown>;
  // Omitted entirely — not sent as null, not sent as {} — when the operator
  // left the secret control untouched, so the server keeps the secret set it
  // holds. Supplying the object replaces that whole set.
  secrets?: Record<string, unknown>;
};

export type HermesConnectionV4WriteBuild =
  | { kind: 'built'; write: HermesConnectionV4Write }
  | { kind: 'unsupported' };

// Builds one save from what the form collected.
//
// Nothing is defaulted into a settings object here. A field the operator did
// not fill is sent empty and refused by the server's own validator, which is
// the only validator of record: a second one in the browser would drift from
// it and start accepting what the server rejects, or worse, the reverse.
export const buildHermesConnectionV4Write = (
  runtimeKind: HermesRuntimeConnectionKind,
  submission: HermesConnectionFormSubmission,
  expectedRevision: number,
): HermesConnectionV4WriteBuild => {
  const { values, secret } = submission;

  if (runtimeKind === 'MAIL') {
    // The one shape the contract allows for mail: a native connected account
    // that is already encrypted, chosen rather than typed, plus the IMAP
    // polling folder. `mailbox` is that FOLDER — INBOX, typically — and not
    // an address; the handle is the server's, obtained from the native
    // account and never sent from here.
    //
    // No secrets key at all: mail credentials live in the native account's
    // own encrypted store, and a second store of ours is what the contract
    // forbids. There is no mailbox password field anywhere on this screen.
    return {
      kind: 'built',
      write: {
        kind: 'MAIL',
        expectedRevision,
        settings: {
          connectedAccountId: values.nativeAccountId.trim(),
          mailbox: values.imapFolder.trim(),
        },
      },
    };
  }

  if (runtimeKind === 'MCP') {
    const write: HermesConnectionV4Write = {
      kind: 'MCP',
      expectedRevision,
      settings: {
        endpoint: values.endpoint.trim(),
        toolName: values.label.trim(),
        // Pinned by the contract, not chosen here.
        protocolVersion: '2025-11-25',
        // `text` is the one required argument name. The optional ones are not
        // invented: the native parser validates this map, and guessing names
        // it has not been given would be this screen designing a tool's
        // interface.
        argumentMap: { text: 'text' },
      },
    };

    // The token is only ever the value typed in this session. It is passed
    // straight through: not trimmed, not normalised, not logged — leading and
    // trailing characters can be part of a secret.
    return {
      kind: 'built',
      write:
        secret.kind === 'replaced'
          ? { ...write, secrets: { token: secret.value } }
          : write,
    };
  }

  // EVOLUTION needs two distinct secrets and INTAKE needs settings this form
  // has no control for. Both are refused before anything leaves the browser
  // rather than sent half-built.
  return { kind: 'unsupported' };
};
