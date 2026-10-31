import {
  type HermesCompaniesRead,
  type HermesCompanyMember,
} from '@/hermes-admin-ui/types/HermesCompany';
import {
  filterHermesMembersByCompany,
  isHermesCompanyActionAvailable,
  readHermesActiveCompany,
  resolveHermesCompanyCreateCapability,
  resolveHermesCompanySwitchCapability,
} from '@/hermes-admin-ui/utils/hermesCompanyAction';

describe('resolveHermesCompanySwitchCapability', () => {
  it('is not configured by default, so an unbriefed screen offers nothing', () => {
    expect(resolveHermesCompanySwitchCapability(undefined)).toEqual({
      kind: 'not-configured',
    });
    expect(resolveHermesCompanySwitchCapability(null)).toEqual({
      kind: 'not-configured',
    });
  });

  it('is not configured when same-origin multi-company is disabled', () => {
    expect(
      resolveHermesCompanySwitchCapability({
        sameOriginEnabled: false,
        isActive: true,
        canCreateCompany: true,
      }),
    ).toEqual({ kind: 'not-configured' });
  });

  it('is not configured when the capability is enabled but not active', () => {
    expect(
      resolveHermesCompanySwitchCapability({
        sameOriginEnabled: true,
        isActive: false,
        canCreateCompany: true,
      }),
    ).toEqual({ kind: 'not-configured' });
  });

  it('does not read an unanswered field as permission', () => {
    expect(
      resolveHermesCompanySwitchCapability({
        sameOriginEnabled: null,
        isActive: true,
        canCreateCompany: true,
      }),
    ).toEqual({ kind: 'unknown' });

    expect(
      resolveHermesCompanySwitchCapability({
        sameOriginEnabled: true,
        isActive: null,
        canCreateCompany: true,
      }),
    ).toEqual({ kind: 'unknown' });
  });

  it('is available on the active capability, with or without the creation right', () => {
    expect(
      resolveHermesCompanySwitchCapability({
        sameOriginEnabled: true,
        isActive: true,
        canCreateCompany: false,
      }),
    ).toEqual({ kind: 'available' });
  });
});

describe('resolveHermesCompanyCreateCapability', () => {
  it('follows the select capability when that one is not available', () => {
    expect(resolveHermesCompanyCreateCapability(undefined)).toEqual({
      kind: 'not-configured',
    });
    expect(
      resolveHermesCompanyCreateCapability({
        sameOriginEnabled: true,
        isActive: null,
        canCreateCompany: true,
      }),
    ).toEqual({ kind: 'unknown' });
  });

  it('is denied on the active capability without the creation right', () => {
    expect(
      resolveHermesCompanyCreateCapability({
        sameOriginEnabled: true,
        isActive: true,
        canCreateCompany: false,
      }),
    ).toEqual({ kind: 'denied', reason: null });
  });

  it('stays unknown when the creation right was not answered', () => {
    expect(
      resolveHermesCompanyCreateCapability({
        sameOriginEnabled: true,
        isActive: true,
        canCreateCompany: null,
      }),
    ).toEqual({ kind: 'unknown' });
  });

  it('is available only with the capability active and the creation right', () => {
    expect(
      resolveHermesCompanyCreateCapability({
        sameOriginEnabled: true,
        isActive: true,
        canCreateCompany: true,
      }),
    ).toEqual({ kind: 'available' });
  });
});

describe('isHermesCompanyActionAvailable', () => {
  it('enables a control for nothing but an available capability', () => {
    expect(isHermesCompanyActionAvailable({ kind: 'available' })).toBe(true);
    expect(isHermesCompanyActionAvailable({ kind: 'not-configured' })).toBe(
      false,
    );
    expect(isHermesCompanyActionAvailable({ kind: 'unknown' })).toBe(false);
    expect(
      isHermesCompanyActionAvailable({ kind: 'denied', reason: null }),
    ).toBe(false);
  });
});

const reported = (
  activeCompanyId: string | null,
): HermesCompaniesRead => ({
  kind: 'reported',
  companies: [
    { id: 'atelier', name: 'Atelier Fontaine', trade: null, primaryMailbox: null },
    { id: 'verdure', name: 'Verdure', trade: null, primaryMailbox: null },
  ],
  activeCompanyId,
  unreadableEntryCount: 0,
});

describe('readHermesActiveCompany', () => {
  it('returns the company the server named as active', () => {
    expect(readHermesActiveCompany(reported('verdure'))?.id).toBe('verdure');
  });

  it('does not fall back to the first company when none is active', () => {
    expect(readHermesActiveCompany(reported(null))).toBeNull();
  });

  it('does not invent an active company out of an id nobody listed', () => {
    expect(readHermesActiveCompany(reported('ghost'))).toBeNull();
  });

  it('has no active company while loading or after a failed read', () => {
    expect(readHermesActiveCompany({ kind: 'loading' })).toBeNull();
    expect(
      readHermesActiveCompany({ kind: 'unknown', message: null }),
    ).toBeNull();
  });
});

const member = (id: string, companyId: string): HermesCompanyMember => ({
  id,
  companyId,
  displayName: id,
  email: null,
  role: 'MEMBER',
  unknownRole: null,
  state: 'ACTIVE',
  unknownState: null,
  // These fixtures exercise the company filter and say nothing about roles,
  // so null is the truthful value: the roles were never read.
  roles: null,
});

describe('filterHermesMembersByCompany', () => {
  const members = [
    member('m1', 'atelier'),
    member('m2', 'verdure'),
    member('m3', 'atelier'),
  ];

  it('never shows a member whose rights stop at another company', () => {
    expect(
      filterHermesMembersByCompany(members, 'verdure').map((m) => m.id),
    ).toEqual(['m2']);
  });

  it('shows nobody rather than everybody when no company is active', () => {
    expect(filterHermesMembersByCompany(members, null)).toEqual([]);
  });
});
