// Operating companies, their members, and what can be done to them.
// An operating company is a workspace: it owns connections, bot policies and
// members. It is NOT a Company customer record. The two are different
// objects, and the screen says so rather than relying on the operator.

import { type HermesMemberRole } from '@/hermes-admin-ui/types/HermesMemberRights';

export const HERMES_COMPANY_MEMBER_ROLES = [
  'ADMIN',
  'MEMBER',
  'READ_ONLY',
] as const;

export type HermesCompanyMemberRole =
  (typeof HERMES_COMPANY_MEMBER_ROLES)[number];

export const isHermesCompanyMemberRole = (
  value: unknown,
): value is HermesCompanyMemberRole =>
  typeof value === 'string' &&
  (HERMES_COMPANY_MEMBER_ROLES as readonly string[]).includes(value);

export const HERMES_COMPANY_MEMBER_STATES = [
  'ACTIVE',
  'INVITED',
  'SUSPENDED',
] as const;

export type HermesCompanyMemberState =
  (typeof HERMES_COMPANY_MEMBER_STATES)[number];

export const isHermesCompanyMemberState = (
  value: unknown,
): value is HermesCompanyMemberState =>
  typeof value === 'string' &&
  (HERMES_COMPANY_MEMBER_STATES as readonly string[]).includes(value);

// One member of one operating company. Read only on this screen.
//
// A role or a state this client does not know is kept verbatim instead of
// being folded into one it does: a member shown as « Lecture seule » when the
// server said something else would be a lie about someone's rights.
export type HermesCompanyMember = {
  id: string;
  companyId: string;
  displayName: string | null;
  email: string | null;
  role: HermesCompanyMemberRole | null;
  unknownRole: string | null;
  state: HermesCompanyMemberState | null;
  unknownState: string | null;
  // The roles this member actually holds, each with the permission flags that
  // decide what it allows.
  //
  // Null means the roles were never read, so nothing may be said about this
  // member's rights. An empty array means the member genuinely holds none,
  // which is a real answer and denies every right.
  //
  // This is where rights are read from, not from `role` above: the native
  // model is additive custom roles, so a single enumerated role could not
  // describe a member holding two.
  roles: readonly HermesMemberRole[] | null;
};

// One operating company the signed-in member is allowed into.
export type HermesCompany = {
  id: string;
  name: string | null;
  // What the company does, and the mailbox it works from. Both are the
  // server's own words; neither is required.
  trade: string | null;
  primaryMailbox: string | null;
};

export type HermesCompaniesRead =
  | { kind: 'loading' }
  | { kind: 'unknown'; message: string | null }
  | {
      kind: 'reported';
      companies: readonly HermesCompany[];
      // The company every setting on this screen applies to. Null when the
      // server did not say: no company is then assumed to be active.
      activeCompanyId: string | null;
      unreadableEntryCount: number;
    };

export type HermesCompanyMembersRead =
  | { kind: 'loading' }
  | { kind: 'unknown'; message: string | null }
  | {
      kind: 'reported';
      members: readonly HermesCompanyMember[];
      unreadableEntryCount: number;
    };

// The client configuration and capability object, as the backend publishes
// them. `sameOriginEnabled` is the configuration boolean; `isActive` and
// `canCreateCompany` come from the capability object. Each is null when the
// server did not say, and null is never read as permission.
export type HermesMultiCompanyReport = {
  sameOriginEnabled: boolean | null;
  isActive: boolean | null;
  canCreateCompany: boolean | null;
};

// Three facts to build on: capability disabled, capability active without the
// creation right, capability active with it. An absent report resolves to
// 'not-configured', which is the real default, and no control is rendered for
// it at all.
export type HermesCompanyActionCapability =
  | { kind: 'not-configured' }
  | { kind: 'unknown' }
  | { kind: 'denied'; reason: string | null }
  | { kind: 'available' };

// The outcome of an attempted switch or creation, as the parent reports it.
// 'session-replaced' is the backend's named refusal: session and native cookie
// no longer agree on user, workspace or membership, typically after a switch
// in another tab. It is an answer, not a breakdown, so it is never retried
// here and never folded into a generic refusal: it asks for a reload.
export type HermesCompanyActionState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'done'; companyId: string | null }
  | { kind: 'refused'; reason: string | null }
  | { kind: 'session-replaced'; message: string | null }
  | { kind: 'unconfirmed' };
