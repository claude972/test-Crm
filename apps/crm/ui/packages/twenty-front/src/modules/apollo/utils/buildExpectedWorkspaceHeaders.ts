export const EXPECTED_WORKSPACE_ID_HEADER = 'X-Expected-Workspace-Id';

// The caller captures the workspace it means to act on and passes it per
// operation. It is never read from mutable client state: a value captured
// before an await must stay bound to the request it was captured for, even
// once the active workspace has moved on.
export const buildExpectedWorkspaceHeaders = (
  expectedWorkspaceId: unknown,
): Record<string, string> =>
  typeof expectedWorkspaceId === 'string' && expectedWorkspaceId.trim() !== ''
    ? { [EXPECTED_WORKSPACE_ID_HEADER]: expectedWorkspaceId.trim() }
    : {};

// An inherited header would survive a spread and keep asserting the previous
// workspace exactly when the caller asked to assert none. Removed by name,
// whatever its casing, before the new one is added.
export const stripExpectedWorkspaceHeader = (
  headers: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) =>
        name.toLowerCase() !== EXPECTED_WORKSPACE_ID_HEADER.toLowerCase(),
    ),
  );
