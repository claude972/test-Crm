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
  fieldPermissionCount: null,
  rowLevelPredicateCount: null,
  rowLevelPredicateGroupCount: null,
};

const ALL_DENIED: HermesMemberRoleFlags = {
  canUpdateAllSettings: false,
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canAccessAllTools: false,
  fieldPermissionCount: 0,
  rowLevelPredicateCount: 0,
  rowLevelPredicateGroupCount: 0,
};

// Everything the server's connection gate requires, and no restriction.
const GATE_PASSES: Partial<HermesMemberRoleFlags> = {
  canUpdateAllSettings: true,
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
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

  it('grants a right from the published facts, not from the role name', () => {
    // A role called « Lecture seule » that satisfies the whole server gate
    // really does configure connections. The label is somebody's wording.
    const misleadinglyNamed = [role('Lecture seule', GATE_PASSES)];

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

  it('takes the union across roles for record rights', () => {
    const several = [
      role('Lecture', { canReadAllObjectRecords: true }),
      role('Écriture', { canUpdateAllObjectRecords: true }),
    ];

    expect(readHermesMemberRight(several, 'READ_RECORDS')).toBe('granted');
    expect(readHermesMemberRight(several, 'WRITE_RECORDS')).toBe('granted');
    expect(readHermesMemberRight(several, 'DELETE_RECORDS')).toBe('denied');
  });

  it('reports an unreported flag as unknown instead of as a refusal', () => {
    const unreported = [{ ...role('Rôle'), flags: NOTHING_REPORTED }];

    expect(readHermesMemberRight(unreported, 'CONFIGURE_CONNECTIONS')).toBe(
      'unknown',
    );
    expect(readHermesMemberRight(unreported, 'READ_RECORDS')).toBe('unknown');
  });

  it('prefers an explicit record grant over a role that reported nothing', () => {
    const mixed = [
      { ...role('Inconnu'), flags: NOTHING_REPORTED },
      role('Lecture', { canReadAllObjectRecords: true }),
    ];

    expect(readHermesMemberRight(mixed, 'READ_RECORDS')).toBe('granted');
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

describe('readHermesMemberRight — the connection gate mirrors the server', () => {
  it('refuses a settings-only role, which the server answers with 403', () => {
    // The exact case from the review: settings true, read-all false. Saying
    // « granted » here tells an administrator they may configure connections
    // and then hands them a refusal.
    const settingsOnly = [
      role('Réglages seuls', {
        canUpdateAllSettings: true,
        canReadAllObjectRecords: false,
        canUpdateAllObjectRecords: true,
      }),
    ];

    expect(
      readHermesMemberRight(settingsOnly, 'CONFIGURE_CONNECTIONS'),
    ).toBe('denied');
    expect(canHermesMemberConfigureConnections(settingsOnly)).toBe(false);
  });

  it('requires all three unrestricted rights, not just the settings one', () => {
    expect(
      readHermesMemberRight(
        [role('Sans écriture', {
          canUpdateAllSettings: true,
          canReadAllObjectRecords: true,
          canUpdateAllObjectRecords: false,
        })],
        'CONFIGURE_CONNECTIONS',
      ),
    ).toBe('denied');
  });

  it('refuses a role restricted by field permissions or row conditions', () => {
    // The server refuses any role carrying these, however unrestricted its
    // flags look.
    for (const restriction of [
      { fieldPermissionCount: 1 },
      { rowLevelPredicateCount: 1 },
      { rowLevelPredicateGroupCount: 1 },
    ]) {
      expect(
        readHermesMemberRight(
          [role('Restreint', { ...GATE_PASSES, ...restriction })],
          'CONFIGURE_CONNECTIONS',
        ),
      ).toBe('denied');
    }
  });

  it('does not claim a grant when a restriction list was never read', () => {
    // Null is not zero: an unread restriction list could be the one the
    // server refuses on.
    expect(
      readHermesMemberRight(
        [role('Partiel', { ...GATE_PASSES, fieldPermissionCount: null })],
        'CONFIGURE_CONNECTIONS',
      ),
    ).toBe('unknown');
  });

  it('reports unknown when several roles disagree, because the server picks one', () => {
    // The server resolves one role target with `findOne`, so its choice is not
    // predictable from here. Neither verdict may be claimed.
    const disagreeing = [
      role('Complet', GATE_PASSES),
      role('Réglages seuls', { canUpdateAllSettings: true }),
    ];

    expect(
      readHermesMemberRight(disagreeing, 'CONFIGURE_CONNECTIONS'),
    ).toBe('unknown');
    expect(canHermesMemberConfigureConnections(disagreeing)).toBe(false);
  });

  it('grants only when every role held satisfies the gate', () => {
    const allPass = [role('A', GATE_PASSES), role('B', GATE_PASSES)];

    expect(readHermesMemberRight(allPass, 'CONFIGURE_CONNECTIONS')).toBe(
      'granted',
    );
  });

  it('denies when no role satisfies the gate', () => {
    const nonePass = [role('A'), role('B', { canUpdateAllSettings: true })];

    expect(readHermesMemberRight(nonePass, 'CONFIGURE_CONNECTIONS')).toBe(
      'denied',
    );
  });
});

describe('the CRM tools flag is not a bot delegation', () => {
  it('is reported as the CRM flag it is', () => {
    // Bot delegation is per company, channel and thread, with an owner and an
    // epoch. This flag knows none of that, so it is named for itself.
    expect(
      readHermesMemberRight(
        [role('Outils', { canAccessAllTools: true })],
        'CRM_ALL_TOOLS_FLAG',
      ),
    ).toBe('granted');
  });
});

describe('readHermesMemberRights', () => {
  it('answers for every published right, so none is silently omitted', () => {
    const resolved = readHermesMemberRights([role('Complet', GATE_PASSES)]);

    expect(resolved).toEqual([
      { right: 'CONFIGURE_CONNECTIONS', standing: 'granted' },
      { right: 'READ_RECORDS', standing: 'granted' },
      { right: 'WRITE_RECORDS', standing: 'granted' },
      { right: 'DELETE_RECORDS', standing: 'denied' },
      { right: 'CRM_ALL_TOOLS_FLAG', standing: 'denied' },
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
      canHermesMemberConfigureConnections([role('Complet', GATE_PASSES)]),
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
