// What a member may actually do here. Nothing is derived from a role's LABEL,
// which is a name somebody chose. Every value is read from the authority that
// will enforce it, or reported as unknown — a right shown as granted and then
// refused by the server is worse than one shown as unknown.

// The rights the settings centre is accountable for showing.
export const HERMES_MEMBER_RIGHTS = [
  // Mirrors the server's own connection gate in full. The settings flag alone
  // is NOT this right; see the predicate below.
  'CONFIGURE_CONNECTIONS',
  'READ_RECORDS',
  'WRITE_RECORDS',
  'DELETE_RECORDS',
  // Named as the CRM flag it is, not as a Hermès right. Bot delegation is per
  // company, per channel and per thread, with an owner and an epoch; this flag
  // knows nothing about any of that and does not imply it.
  'CRM_ALL_TOOLS_FLAG',
] as const;

export type HermesMemberRight = (typeof HERMES_MEMBER_RIGHTS)[number];

export const isHermesMemberRight = (
  value: unknown,
): value is HermesMemberRight =>
  typeof value === 'string' &&
  (HERMES_MEMBER_RIGHTS as readonly string[]).includes(value);

// Whether a right is held. 'unknown' is a fact the server did not publish, or
// one this screen cannot resolve unambiguously. It is kept apart from 'denied'
// and never shown as a refusal.
export type HermesMemberRightStanding = 'granted' | 'denied' | 'unknown';

// The published facts of one role.
//
// Every field is nullable because a query that did not select something
// reports nothing about it, which is not the same as false or zero.
export type HermesMemberRoleFlags = {
  canUpdateAllSettings: boolean | null;
  canReadAllObjectRecords: boolean | null;
  canUpdateAllObjectRecords: boolean | null;
  canSoftDeleteAllObjectRecords: boolean | null;
  canDestroyAllObjectRecords: boolean | null;
  canAccessAllTools: boolean | null;
  // The restrictions the server's connection gate refuses outright. Counts,
  // not booleans: zero is the only value it accepts, and null means the
  // restriction list was not read at all.
  fieldPermissionCount: number | null;
  rowLevelPredicateCount: number | null;
  rowLevelPredicateGroupCount: number | null;
};

export type HermesMemberRole = {
  id: string | null;
  label: string | null;
  flags: HermesMemberRoleFlags;
};

const FLAGS_BY_RIGHT: Record<
  HermesMemberRight,
  readonly (keyof HermesMemberRoleFlags)[]
> = {
  // Resolved by its own predicate, not by this table.
  CONFIGURE_CONNECTIONS: [],
  READ_RECORDS: ['canReadAllObjectRecords'],
  WRITE_RECORDS: ['canUpdateAllObjectRecords'],
  DELETE_RECORDS: [
    'canSoftDeleteAllObjectRecords',
    'canDestroyAllObjectRecords',
  ],
  CRM_ALL_TOOLS_FLAG: ['canAccessAllTools'],
};

// Whether ONE role satisfies the server's connection gate.
//
// The server requires unrestricted settings AND read-all AND update-all, and
// refuses any role carrying field permissions, row-level predicates or
// predicate groups. Settings without read-all is a 403, so it is not granted.
const roleSatisfiesConnectionGate = (
  role: HermesMemberRole,
): HermesMemberRightStanding => {
  const { flags } = role;

  const required = [
    flags.canUpdateAllSettings,
    flags.canReadAllObjectRecords,
    flags.canUpdateAllObjectRecords,
  ];

  // An explicit false anywhere is a refusal the server will make.
  if (required.includes(false)) {
    return 'denied';
  }

  const restrictions = [
    flags.fieldPermissionCount,
    flags.rowLevelPredicateCount,
    flags.rowLevelPredicateGroupCount,
  ];

  // Any restriction present is also a refusal.
  if (restrictions.some((count) => count !== null && count > 0)) {
    return 'denied';
  }

  // Nothing refuses it, but something went unreported: the server's verdict
  // cannot be predicted from here, so it is not claimed.
  if (required.includes(null) || restrictions.includes(null)) {
    return 'unknown';
  }

  return 'granted';
};

// The connection right across the roles a member holds.
//
// The server resolves it through ONE role target chosen by `findOne`, so with
// several roles its choice is not predictable from here. Certainty is only
// possible when every role agrees: all pass, or none does.
const readConnectionRight = (
  roles: readonly HermesMemberRole[],
): HermesMemberRightStanding => {
  const verdicts = roles.map(roleSatisfiesConnectionGate);

  if (verdicts.every((verdict) => verdict === 'granted')) {
    return 'granted';
  }

  if (verdicts.every((verdict) => verdict === 'denied')) {
    return 'denied';
  }

  return 'unknown';
};

// One right across every role held.
//
// The record rights stay additive, which is how the native permission model
// resolves them. The connection right does not: it mirrors the server's gate.
export const readHermesMemberRight = (
  roles: readonly HermesMemberRole[] | null,
  right: HermesMemberRight,
): HermesMemberRightStanding => {
  // The roles were not read at all, so nothing can be said.
  if (roles === null) {
    return 'unknown';
  }

  // Genuinely no role: the server finds no role target and refuses.
  if (roles.length === 0) {
    return 'denied';
  }

  if (right === 'CONFIGURE_CONNECTIONS') {
    return readConnectionRight(roles);
  }

  const flagNames = FLAGS_BY_RIGHT[right];

  let sawUnreported = false;

  for (const role of roles) {
    for (const flagName of flagNames) {
      const flag = role.flags[flagName];

      if (flag === true) {
        return 'granted';
      }

      if (flag === null) {
        sawUnreported = true;
      }
    }
  }

  return sawUnreported ? 'unknown' : 'denied';
};

export const readHermesMemberRights = (
  roles: readonly HermesMemberRole[] | null,
): readonly { right: HermesMemberRight; standing: HermesMemberRightStanding }[] =>
  HERMES_MEMBER_RIGHTS.map((right) => ({
    right,
    standing: readHermesMemberRight(roles, right),
  }));

// Whether this member is an administrator the connections contract accepts
// writes from. Only an explicit grant counts: an unknown verdict is not
// permission, and a role's name never is.
export const canHermesMemberConfigureConnections = (
  roles: readonly HermesMemberRole[] | null,
): boolean =>
  readHermesMemberRight(roles, 'CONFIGURE_CONNECTIONS') === 'granted';

// The labels the server gave for the roles held, with blanks dropped. Shown
// next to the rights rather than instead of them.
export const readHermesMemberRoleLabels = (
  roles: readonly HermesMemberRole[] | null,
): readonly string[] => {
  if (roles === null) {
    return [];
  }

  return roles.flatMap((role) => {
    const label = role.label?.trim();

    return label === undefined || label === '' ? [] : [label];
  });
};
