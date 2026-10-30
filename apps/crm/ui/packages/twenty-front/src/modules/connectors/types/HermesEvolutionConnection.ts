import { type HermesEvolutionConnectionStatus } from '@/connectors/types/HermesEvolutionConnectionStatus';

// Mirrors the published contract exactly. The query takes no argument: the
// server resolves the connection for the session's workspace.
//
// No API key, no base URL and no instance identifier appear in this contract,
// and none may be added here. providerState and errorCode are provider-sourced
// diagnostics, shown as labels only.
export type HermesEvolutionConnection = {
  workspaceId: string;
  provider: string;
  status: HermesEvolutionConnectionStatus;
  // The provider's own wording for its state. Untrusted text: displayed as a
  // diagnostic label, never parsed into a status and never rendered as markup.
  providerState: string | null;
  // When the server last checked. Null means it has never been checked, which
  // is not the same as a healthy line.
  checkedAt: string | null;
  errorCode: string | null;
};
