import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesCompaniesRead,
  type HermesCompany,
  type HermesCompanyActionCapability,
  type HermesMultiCompanyReport,
  type HermesCompanyMember,
} from '@/hermes-admin-ui/types/HermesCompany';

// Selecting a company. Disabled configuration or an absent report is
// 'not-configured', the real default; an unanswered field stays unknown,
// because unknown is not permission.
export const resolveHermesCompanySwitchCapability = (
  report: HermesMultiCompanyReport | null | undefined,
): HermesCompanyActionCapability => {
  if (!isDefined(report) || report.sameOriginEnabled === false) {
    return { kind: 'not-configured' };
  }

  if (report.sameOriginEnabled === null || report.isActive === null) {
    return { kind: 'unknown' };
  }

  // Enabled in configuration but not active: nothing would answer a select.
  if (report.isActive === false) {
    return { kind: 'not-configured' };
  }

  return { kind: 'available' };
};

// Creating a company. It needs the capability active AND the creation right,
// which is the third of the three facts the backend publishes.
export const resolveHermesCompanyCreateCapability = (
  report: HermesMultiCompanyReport | null | undefined,
): HermesCompanyActionCapability => {
  const selectCapability = resolveHermesCompanySwitchCapability(report);

  if (selectCapability.kind !== 'available' || !isDefined(report)) {
    return selectCapability;
  }

  if (report.canCreateCompany === null) {
    return { kind: 'unknown' };
  }

  if (report.canCreateCompany === false) {
    return { kind: 'denied', reason: null };
  }

  return { kind: 'available' };
};

export const isHermesCompanyActionAvailable = (
  capability: HermesCompanyActionCapability,
): boolean => capability.kind === 'available';

// The active company, or nothing. No fallback to the first in the list: a
// settings screen that guessed which company it was editing would be the
// single most dangerous thing in this module.
export const readHermesActiveCompany = (
  read: HermesCompaniesRead,
): HermesCompany | null => {
  if (read.kind !== 'reported' || read.activeCompanyId === null) {
    return null;
  }

  return (
    read.companies.find((company) => company.id === read.activeCompanyId) ??
    null
  );
};

// Members of one company only, so a member list cannot show someone whose
// rights stop at another company.
export const filterHermesMembersByCompany = (
  members: readonly HermesCompanyMember[],
  companyId: string | null,
): readonly HermesCompanyMember[] =>
  companyId === null
    ? []
    : members.filter((member) => member.companyId === companyId);
