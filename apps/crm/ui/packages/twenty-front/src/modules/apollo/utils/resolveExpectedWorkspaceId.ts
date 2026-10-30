// The workspace an operation is meant for.
//
// Three cases, deliberately distinct. An explicit null means "send nothing":
// a cold bootstrap read may hold a stale workspace in local storage while the
// cookie already points elsewhere, and asserting the stale one would loop on a
// superseded session. Undefined means the caller said nothing, so the client
// speaks for the workspace it was built for. A string is that caller's choice.
export const resolveExpectedWorkspaceId = (
  explicitFromContext: unknown,
  instanceWorkspaceId: string | null,
): string | null => {
  if (explicitFromContext === null) {
    return null;
  }

  if (
    typeof explicitFromContext === 'string' &&
    explicitFromContext.trim() !== ''
  ) {
    return explicitFromContext.trim();
  }

  return instanceWorkspaceId;
};
