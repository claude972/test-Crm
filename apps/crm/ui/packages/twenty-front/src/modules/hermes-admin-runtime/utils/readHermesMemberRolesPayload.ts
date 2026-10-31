import {
  type HermesMemberRole,
  type HermesMemberRoleFlags,
} from '@/hermes-admin-ui/types/HermesMemberRights';

// The server answers roles→members; the table needs member→roles. The
// inversion is a pure function so it can be tested without a client. A flag
// the server did not send stays null, never false.

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

// Only a real boolean counts. A missing field, a null, or anything of another
// type is « not reported ».
const readFlag = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const readText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
};

// A restriction list that is not an array was not reported. Null, not zero:
// the server refuses any role carrying one, so guessing zero would claim a
// grant the server will deny.
const readCount = (value: unknown): number | null =>
  Array.isArray(value) ? value.length : null;

const readFlags = (record: Record<string, unknown>): HermesMemberRoleFlags => ({
  canUpdateAllSettings: readFlag(record.canUpdateAllSettings),
  canReadAllObjectRecords: readFlag(record.canReadAllObjectRecords),
  canUpdateAllObjectRecords: readFlag(record.canUpdateAllObjectRecords),
  canSoftDeleteAllObjectRecords: readFlag(record.canSoftDeleteAllObjectRecords),
  canDestroyAllObjectRecords: readFlag(record.canDestroyAllObjectRecords),
  canAccessAllTools: readFlag(record.canAccessAllTools),
  fieldPermissionCount: readCount(record.fieldPermissions),
  rowLevelPredicateCount: readCount(record.rowLevelPermissionPredicates),
  rowLevelPredicateGroupCount: readCount(
    record.rowLevelPermissionPredicateGroups,
  ),
});

export type HermesMemberRolesRead =
  // The roles could not be read — the query failed, or the signed-in member
  // may not list them. Every right then reports « inconnu », which is the
  // honest answer and never a refusal.
  | { kind: 'unknown' }
  | {
      kind: 'reported';
      // Members absent from this map hold no role at all, which is a real
      // answer and distinct from an unread one.
      rolesByMemberId: ReadonlyMap<string, readonly HermesMemberRole[]>;
    };

export const readHermesMemberRolesPayload = (
  payload: unknown,
): HermesMemberRolesRead => {
  if (!Array.isArray(payload)) {
    return { kind: 'unknown' };
  }

  const rolesByMemberId = new Map<string, HermesMemberRole[]>();

  for (const entry of payload) {
    const record = readRecord(entry);

    if (record === null) {
      continue;
    }

    const role: HermesMemberRole = {
      id: readText(record.id),
      label: readText(record.label),
      flags: readFlags(record),
    };

    const members = record.workspaceMembers;

    if (!Array.isArray(members)) {
      continue;
    }

    for (const member of members) {
      const memberRecord = readRecord(member);
      const memberId =
        memberRecord === null ? null : readText(memberRecord.id);

      if (memberId === null) {
        continue;
      }

      const held = rolesByMemberId.get(memberId);

      if (held === undefined) {
        rolesByMemberId.set(memberId, [role]);
      } else {
        held.push(role);
      }
    }
  }

  return { kind: 'reported', rolesByMemberId };
};

// The roles one member holds, as the rights model expects them.
//
// Null means the roles were never read, so nothing may be said. An empty array
// means the member genuinely holds none, which denies every right.
export const readHermesRolesForMember = (
  read: HermesMemberRolesRead,
  memberId: string,
): readonly HermesMemberRole[] | null =>
  read.kind === 'unknown' ? null : (read.rolesByMemberId.get(memberId) ?? []);
