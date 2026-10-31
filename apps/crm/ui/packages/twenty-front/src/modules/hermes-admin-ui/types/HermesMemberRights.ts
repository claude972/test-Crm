// What a member may actually do in this operating company.
//
// A role LABEL is a name somebody chose; it is not a right. « Admin » can be a
// role with nothing enabled, and a custom role nobody recognises can be the
// one that configures the connections. So nothing here is derived from a
// label: every right comes from the permission flags the server publishes on
// the role itself.
//
// Roles are additive: a member holding several roles has the union of what
// they grant. That is how the native permission model resolves them, so it is
// how they are resolved here — taking the first role, or the strictest one,
// would understate what the person can do.

// The rights the settings centre is accountable for showing. Each one maps to
// published permission flags and to nothing else.
export const HERMES_MEMBER_RIGHTS = [
  // The gate for this whole screen: configuring a connection requires the
  // unrestricted settings right, which is what the connections contract means
  // by an unrestricted workspace administrator.
  'CONFIGURE_CONNECTIONS',
  'READ_RECORDS',
  'WRITE_RECORDS',
  'DELETE_RECORDS',
  // Whether the member may use the tools a bot would call.
  'USE_BOT_TOOLS',
] as const;

export type HermesMemberRight = (typeof HERMES_MEMBER_RIGHTS)[number];

export const isHermesMemberRight = (
  value: unknown,
): value is HermesMemberRight =>
  typeof value === 'string' &&
  (HERMES_MEMBER_RIGHTS as readonly string[]).includes(value);

// Whether a right is held.
//
// 'unknown' is a flag the server did not publish. It is kept apart from
// 'denied' and never shown as a refusal: telling an administrator that someone
// lacks a right, when the right was simply not reported, would be a false
// statement about that person.
export type HermesMemberRightStanding = 'granted' | 'denied' | 'unknown';

// The permission flags of one role, exactly as published. Every field is
// nullable because a query that did not select a flag reports nothing about
// it, which is not the same as reporting false.
export type HermesMemberRoleFlags = {
  canUpdateAllSettings: boolean | null;
  canReadAllObjectRecords: boolean | null;
  canUpdateAllObjectRecords: boolean | null;
  canSoftDeleteAllObjectRecords: boolean | null;
  canDestroyAllObjectRecords: boolean | null;
  canAccessAllTools: boolean | null;
};

// One role a member holds: the server's own label, and the flags it carries.
export type HermesMemberRole = {
  id: string | null;
  label: string | null;
  flags: HermesMemberRoleFlags;
};

// Which flags decide one right. A right backed by several flags is granted
// when any of them is, because each one independently allows the action.
const FLAGS_BY_RIGHT: Record<
  HermesMemberRight,
  readonly (keyof HermesMemberRoleFlags)[]
> = {
  CONFIGURE_CONNECTIONS: ['canUpdateAllSettings'],
  READ_RECORDS: ['canReadAllObjectRecords'],
  WRITE_RECORDS: ['canUpdateAllObjectRecords'],
  // Either kind of deletion is a deletion as far as the operator is concerned.
  DELETE_RECORDS: [
    'canSoftDeleteAllObjectRecords',
    'canDestroyAllObjectRecords',
  ],
  USE_BOT_TOOLS: ['canAccessAllTools'],
};

// One right, resolved across every role the member holds.
//
// Granted as soon as one role grants it. Otherwise unknown if anything was
// left unreported, because an unreported flag could have been the one that
// granted it. Denied only when every relevant flag of every role came back
// false — which is the only case where a refusal can honestly be stated.
export const readHermesMemberRight = (
  roles: readonly HermesMemberRole[] | null,
  right: HermesMemberRight,
): HermesMemberRightStanding => {
  // The roles were not read at all. Nothing can be said.
  if (roles === null) {
    return 'unknown';
  }

  // Genuinely no role. A member holding no role holds no right through one,
  // and that is a real answer rather than a missing one.
  if (roles.length === 0) {
    return 'denied';
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

// Whether this member is one of the administrators the connections contract
// accepts writes from.
//
// Only an explicit grant counts. An unknown flag is not permission, and the
// screen never presents a member as able to configure connections on the
// strength of a role name.
export const canHermesMemberConfigureConnections = (
  roles: readonly HermesMemberRole[] | null,
): boolean => readHermesMemberRight(roles, 'CONFIGURE_CONNECTIONS') === 'granted';

// The labels the server gave for the roles a member holds, in order, with
// blanks dropped. Shown next to the rights rather than instead of them: the
// label says what somebody called the role, the rights say what it does.
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
