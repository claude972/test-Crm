import {
  readHermesMemberRolesPayload,
  readHermesRolesForMember,
} from '@/hermes-admin-runtime/utils/readHermesMemberRolesPayload';
import {
  canHermesMemberConfigureConnections,
  readHermesMemberRight,
} from '@/hermes-admin-ui/types/HermesMemberRights';

describe('readHermesMemberRolesPayload', () => {
  it('inverts roles into the roles each member holds', () => {
    const read = readHermesMemberRolesPayload([
      {
        id: 'role-full',
        label: 'Complet',
        canUpdateAllSettings: true,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: true,
        canSoftDeleteAllObjectRecords: false,
        canDestroyAllObjectRecords: false,
        canAccessAllTools: false,
        fieldPermissions: [],
        rowLevelPermissionPredicates: [],
        rowLevelPermissionPredicateGroups: [],
        workspaceMembers: [{ id: 'member-a' }],
      },
      {
        id: 'role-read',
        label: 'Lecture',
        canUpdateAllSettings: false,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: false,
        canSoftDeleteAllObjectRecords: false,
        canDestroyAllObjectRecords: false,
        canAccessAllTools: false,
        fieldPermissions: [],
        rowLevelPermissionPredicates: [],
        rowLevelPermissionPredicateGroups: [],
        workspaceMembers: [{ id: 'member-b' }],
      },
    ]);

    expect(read.kind).toBe('reported');

    // Member A holds the role that satisfies the server's whole gate.
    const aRoles = readHermesRolesForMember(read, 'member-a');

    expect(aRoles).toHaveLength(1);
    expect(canHermesMemberConfigureConnections(aRoles)).toBe(true);
    expect(readHermesMemberRight(aRoles, 'READ_RECORDS')).toBe('granted');

    // Member B holds only the reading role, which the gate refuses.
    const bRoles = readHermesRolesForMember(read, 'member-b');

    expect(canHermesMemberConfigureConnections(bRoles)).toBe(false);
    expect(readHermesMemberRight(bRoles, 'READ_RECORDS')).toBe('granted');
  });

  it('reports a member nobody listed as holding no role, which is an answer', () => {
    const read = readHermesMemberRolesPayload([]);

    // An empty role list denies every right, rather than leaving them unknown.
    expect(readHermesRolesForMember(read, 'member-c')).toEqual([]);
    expect(
      readHermesMemberRight(
        readHermesRolesForMember(read, 'member-c'),
        'CONFIGURE_CONNECTIONS',
      ),
    ).toBe('denied');
  });

  it('says nothing about rights when the roles could not be read', () => {
    for (const payload of [null, undefined, {}, 'getRoles', 7]) {
      const read = readHermesMemberRolesPayload(payload);

      expect(read.kind).toBe('unknown');
      // Null, not an empty array: an unread query is not « no role ».
      expect(readHermesRolesForMember(read, 'member-a')).toBeNull();
      expect(
        readHermesMemberRight(
          readHermesRolesForMember(read, 'member-a'),
          'CONFIGURE_CONNECTIONS',
        ),
      ).toBe('unknown');
    }
  });

  it('does not read a missing flag as a refusal', () => {
    // The flag was not published. Reporting 'denied' would state a refusal
    // the server never expressed.
    const read = readHermesMemberRolesPayload([
      { id: 'r', label: 'Partiel', workspaceMembers: [{ id: 'm' }] },
    ]);

    expect(
      readHermesMemberRight(
        readHermesRolesForMember(read, 'm'),
        'CONFIGURE_CONNECTIONS',
      ),
    ).toBe('unknown');
  });

  it('reads an unreported restriction list as null, never as zero', () => {
    // The server refuses any role carrying a restriction, so an unread list
    // cannot be assumed empty.
    const read = readHermesMemberRolesPayload([
      {
        id: 'r',
        label: 'Sans restrictions lues',
        canUpdateAllSettings: true,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: true,
        workspaceMembers: [{ id: 'm' }],
      },
    ]);

    expect(
      readHermesMemberRight(
        readHermesRolesForMember(read, 'm'),
        'CONFIGURE_CONNECTIONS',
      ),
    ).toBe('unknown');
  });

  it('counts a reported restriction and refuses the gate on it', () => {
    const read = readHermesMemberRolesPayload([
      {
        id: 'r',
        label: 'Restreint par champ',
        canUpdateAllSettings: true,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: true,
        fieldPermissions: [{ id: 'f1' }],
        rowLevelPermissionPredicates: [],
        rowLevelPermissionPredicateGroups: [],
        workspaceMembers: [{ id: 'm' }],
      },
    ]);

    expect(
      readHermesMemberRight(
        readHermesRolesForMember(read, 'm'),
        'CONFIGURE_CONNECTIONS',
      ),
    ).toBe('denied');
  });

  it('does not accept a non-boolean as a granted flag', () => {
    const read = readHermesMemberRolesPayload([
      {
        id: 'r',
        label: 'Truqué',
        canUpdateAllSettings: 'true',
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: true,
        fieldPermissions: [],
        rowLevelPermissionPredicates: [],
        rowLevelPermissionPredicateGroups: [],
        workspaceMembers: [{ id: 'm' }],
      },
    ]);

    // A string is not permission. It is treated as unreported.
    expect(
      canHermesMemberConfigureConnections(readHermesRolesForMember(read, 'm')),
    ).toBe(false);
  });

  it('skips malformed roles and members without dropping the rest', () => {
    const read = readHermesMemberRolesPayload([
      null,
      'role',
      { id: 'no-members', label: 'Sans membres' },
      {
        id: 'r',
        label: 'Complet',
        canUpdateAllSettings: true,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: true,
        fieldPermissions: [],
        rowLevelPermissionPredicates: [],
        rowLevelPermissionPredicateGroups: [],
        workspaceMembers: [null, { id: '  ' }, { id: 'm' }],
      },
    ]);

    expect(
      canHermesMemberConfigureConnections(readHermesRolesForMember(read, 'm')),
    ).toBe(true);
  });

  it('keeps a role whose label is blank, because its flags still count', () => {
    const read = readHermesMemberRolesPayload([
      {
        id: 'r',
        label: '   ',
        canUpdateAllSettings: true,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: true,
        fieldPermissions: [],
        rowLevelPermissionPredicates: [],
        rowLevelPermissionPredicateGroups: [],
        workspaceMembers: [{ id: 'm' }],
      },
    ]);

    const roles = readHermesRolesForMember(read, 'm');

    expect(roles).toHaveLength(1);
    expect(roles?.[0].label).toBeNull();
    expect(canHermesMemberConfigureConnections(roles)).toBe(true);
  });
});
