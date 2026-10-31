import {
  canHermesMemberConfigureConnections,
  readHermesMemberRight,
  readHermesMemberRights,
  readHermesMemberRoleLabels,
  type HermesMemberRole,
  type HermesMemberRoleFlags,
} from '@/hermes-admin-ui/types/HermesMemberRights';

const NOTHING_REPORTED: HermesMemberRoleFlags = {
  canUpdateAllSettings: null,
  canReadAllObjectRecords: null,
  canUpdateAllObjectRecords: null,
  canSoftDeleteAllObjectRecords: null,
  canDestroyAllObjectRecords: null,
  canAccessAllTools: null,
};

const ALL_DENIED: HermesMemberRoleFlags = {
  canUpdateAllSettings: false,
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canAccessAllTools: false,
};

const role = (
  label: string | null,
  flags: Partial<HermesMemberRoleFlags> = {},
): HermesMemberRole => ({
  id: `role-${label ?? 'unnamed'}`,
  label,
  flags: { ...ALL_DENIED, ...flags },
});

describe('readHermesMemberRight', () => {
  it('says nothing about rights when the roles were never read', () => {
    // Null is an unread query, not an empty role list. Reporting 'denied' here
    // would state a refusal the server never expressed.
    expect(readHermesMemberRight(null, 'CONFIGURE_CONNECTIONS')).toBe(
      'unknown',
    );
  });

  it('denies every right to a member who genuinely holds no role', () => {
    // An empty list is a real answer: no role, so no right through one.
    expect(readHermesMemberRight([], 'CONFIGURE_CONNECTIONS')).toBe('denied');
    expect(readHermesMemberRight([], 'READ_RECORDS')).toBe('denied');
  });

  it('grants a right from the published flag, not from the role name', () => {
    // A role called « Lecture seule » that carries the settings flag really
    // does configure connections. The label is somebody's wording; the flag is
    // the permission.
    const misleadinglyNamed = [
      role('Lecture seule', { canUpdateAllSettings: true }),
    ];

    expect(
      readHermesMemberRight(misleadinglyNamed, 'CONFIGURE_CONNECTIONS'),
    ).toBe('granted');
  });

  it('does not grant a right to a role merely called administrator', () => {
    const nameOnly = [role('Administrateur')];

    expect(readHermesMemberRight(nameOnly, 'CONFIGURE_CONNECTIONS')).toBe(
      'denied',
    );
  });

  it('takes the union across roles rather than the first or the strictest', () => {
    const several = [
      role('Lecture', { canReadAllObjectRecords: true }),
      role('Réglages', { canUpdateAllSettings: true }),
    ];

    expect(readHermesMemberRight(several, 'CONFIGURE_CONNECTIONS')).toBe(
      'granted',
    );
    expect(readHermesMemberRight(several, 'READ_RECORDS')).toBe('granted');
    expect(readHermesMemberRight(several, 'WRITE_RECORDS')).toBe('denied');
  });

  it('reports an unreported flag as unknown instead of as a refusal', () => {
    const unreported = [{ ...role('Rôle'), flags: NOTHING_REPORTED }];

    expect(readHermesMemberRight(unreported, 'CONFIGURE_CONNECTIONS')).toBe(
      'unknown',
    );
  });

  it('prefers an explicit grant over another role that reported nothing', () => {
    const mixed = [
      { ...role('Inconnu'), flags: NOTHING_REPORTED },
      role('Réglages', { canUpdateAllSettings: true }),
    ];

    expect(readHermesMemberRight(mixed, 'CONFIGURE_CONNECTIONS')).toBe(
      'granted',
    );
  });

  it('treats either kind of deletion as the deletion right', () => {
    const softOnly = [role('Corbeille', { canSoftDeleteAllObjectRecords: true })];
    const hardOnly = [role('Purge', { canDestroyAllObjectRecords: true })];

    expect(readHermesMemberRight(softOnly, 'DELETE_RECORDS')).toBe('granted');
    expect(readHermesMemberRight(hardOnly, 'DELETE_RECORDS')).toBe('granted');
  });

  it('keeps the deletion right denied when both deletion flags are false', () => {
    expect(readHermesMemberRight([role('Rien')], 'DELETE_RECORDS')).toBe(
      'denied',
    );
  });
});

describe('readHermesMemberRights', () => {
  it('answers for every published right, so none is silently omitted', () => {
    const resolved = readHermesMemberRights([
      role('Réglages', { canUpdateAllSettings: true }),
    ]);

    expect(resolved).toEqual([
      { right: 'CONFIGURE_CONNECTIONS', standing: 'granted' },
      { right: 'READ_RECORDS', standing: 'denied' },
      { right: 'WRITE_RECORDS', standing: 'denied' },
      { right: 'DELETE_RECORDS', standing: 'denied' },
      { right: 'USE_BOT_TOOLS', standing: 'denied' },
    ]);
  });
});

describe('canHermesMemberConfigureConnections', () => {
  it('requires an explicit grant and never accepts an unknown flag', () => {
    expect(canHermesMemberConfigureConnections(null)).toBe(false);
    expect(
      canHermesMemberConfigureConnections([
        { ...role('Rôle'), flags: NOTHING_REPORTED },
      ]),
    ).toBe(false);
    expect(
      canHermesMemberConfigureConnections([
        role('Réglages', { canUpdateAllSettings: true }),
      ]),
    ).toBe(true);
  });
});

describe('readHermesMemberRoleLabels', () => {
  it('keeps the server wording and drops what is blank', () => {
    expect(
      readHermesMemberRoleLabels([
        role('Réglages'),
        role('   '),
        role(null),
        role('Lecture'),
      ]),
    ).toEqual(['Réglages', 'Lecture']);
  });

  it('returns nothing when the roles were never read', () => {
    expect(readHermesMemberRoleLabels(null)).toEqual([]);
  });
});
