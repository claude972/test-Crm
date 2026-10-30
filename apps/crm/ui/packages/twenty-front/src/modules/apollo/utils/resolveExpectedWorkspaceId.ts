// The workspace an operation is meant for: what the caller explicitly asked
// for, otherwise the one this client instance was built for. The instance
// value is captured at construction and never re-read, so a client built for
// one workspace can never carry a request for another.
export const resolveExpectedWorkspaceId = (
  explicitFromContext: unknown,
  instanceWorkspaceId: string | null,
): string | null => {
  if (
    typeof explicitFromContext === 'string' &&
    explicitFromContext.trim() !== ''
  ) {
    return explicitFromContext.trim();
  }

  return instanceWorkspaceId;
};
