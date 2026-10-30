import { isDefined } from 'kovaa-lab-shared/utils';

type BuildStructureScopeCacheKeyArgs = {
  // Identifies the session, so a different user or a re-login never reads the
  // previous holder's cached scope. The contract requires this.
  sessionKey: string;
  // Undefined means "every authorised structure", which the contract treats as
  // a distinct scope from an explicit list. An empty array is the empty scope.
  workspaceIds?: string[];
  periodStart?: string;
  periodEnd?: string;
};

const SCOPE_ALL = 'all';
const SCOPE_NONE = 'none';
const UNBOUNDED = 'unbounded';

// Cache keys for the structure dashboard. The contract is explicit: a frontend
// cache includes the user/session, the sorted scope ids and the period bounds,
// and is cleared on session change or revocation. Sorting matters because
// [A,B] and [B,A] are the same authorised scope and must not be fetched twice,
// while "omitted" and "explicitly all" are NOT interchangeable: the server
// resolves the authorised set per request, so the omitted form must keep its
// own key rather than be expanded client-side.
export const buildStructureScopeCacheKey = ({
  sessionKey,
  workspaceIds,
  periodStart,
  periodEnd,
}: BuildStructureScopeCacheKeyArgs): string => {
  const scope = !isDefined(workspaceIds)
    ? SCOPE_ALL
    : workspaceIds.length === 0
      ? SCOPE_NONE
      : [...new Set(workspaceIds)].sort().join(',');

  return [
    'hermes-structure-dashboard',
    sessionKey,
    scope,
    periodStart ?? UNBOUNDED,
    periodEnd ?? UNBOUNDED,
  ].join('|');
};
