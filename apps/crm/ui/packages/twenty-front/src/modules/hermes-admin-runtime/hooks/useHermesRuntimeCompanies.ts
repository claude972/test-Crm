import { useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { availableWorkspacesState } from '@/auth/states/availableWorkspacesState';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAuth } from '@/auth/hooks/useAuth';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import {
  type HermesCompaniesRead,
  type HermesCompany,
  type HermesCompanyActionCapability,
  type HermesCompanyActionState,
  type HermesCompanyMember,
  type HermesCompanyMembersRead,
} from '@/hermes-admin-ui/types/HermesCompany';
import { HERMES_MEMBER_ROLES } from '@/hermes-admin-runtime/graphql/metadata-queries/hermesMemberRoles';
import {
  readHermesMemberRolesPayload,
  readHermesRolesForMember,
} from '@/hermes-admin-runtime/utils/readHermesMemberRolesPayload';
import { readHermesRuntimeFailure } from '@/hermes-admin-runtime/utils/readHermesRuntimeFailure';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export type HermesRuntimeCompanies = {
  companiesRead: HermesCompaniesRead;
  membersRead: HermesCompanyMembersRead;
  switchCapability: HermesCompanyActionCapability;
  switchState: HermesCompanyActionState;
  addCapability: HermesCompanyActionCapability;
  addState: HermesCompanyActionState;
  activeCompanyId: string | null;
  isSessionReplaced: boolean;
  hasWriteInFlight: boolean;
  requestSwitch: (companyId: string) => void;
  requestAdd: (displayName: string) => void;
};

// The operating companies the signed-in member may work in, and the two moves
// that change which one is active.
//
// Neither move is reimplemented here. `selectWorkspaceOnSameOrigin` and
// `createWorkspaceOnSameOrigin` are the authentication hook's own methods:
// they capture the source company, call the native mutations, validate the
// returned login pair and redeem it. This hook calls them, waits for the
// promise and maps the outcome onto the states the settings centre shows. No
// authentication mutation is written here, no token is read, written or
// stored, and no permission is granted.
export const useHermesRuntimeCompanies = (): HermesRuntimeCompanies => {
  const { selectWorkspaceOnSameOrigin, createWorkspaceOnSameOrigin } =
    useAuth();

  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const availableWorkspaces = useAtomStateValue(availableWorkspacesState);
  const currentWorkspaceMembers = useAtomStateValue(currentWorkspaceMembersState);
  const isSameOriginMultiWorkspaceEnabled = useAtomStateValue(
    isSameOriginMultiWorkspaceEnabledState,
  );

  // The roles of the active company, with their permission flags. Asked for
  // here because the shared member fragment loaded at sign-in does not select
  // `roles`, which is why every member's role used to read « inconnu ».
  //
  // errorPolicy 'all': a member who may not list roles still sees the member
  // table, with their rights reported as unknown rather than as refusals.
  const { data: rolesData, error: rolesError } = useQuery<{
    getRoles: unknown;
  }>(HERMES_MEMBER_ROLES, { errorPolicy: 'all' });

  const [switchState, setSwitchState] = useState<HermesCompanyActionState>({
    kind: 'idle',
  });
  const [addState, setAddState] = useState<HermesCompanyActionState>({
    kind: 'idle',
  });
  const [isSessionReplaced, setIsSessionReplaced] = useState(false);

  const activeCompanyId = currentWorkspace?.id ?? null;

  const companiesRead = useMemo<HermesCompaniesRead>(() => {
    const byId = new Map<string, HermesCompany>();

    // The active company first, so the screen can always name the company it
    // is editing even when the sign-in list has not been loaded.
    if (isDefined(currentWorkspace)) {
      byId.set(currentWorkspace.id, {
        id: currentWorkspace.id,
        name: currentWorkspace.displayName ?? null,
        // Neither is published for a workspace. Null stays null: a trade or a
        // mailbox invented here would read as the server's own words.
        trade: null,
        primaryMailbox: null,
      });
    }

    for (const workspace of availableWorkspaces.availableWorkspacesForSignIn) {
      if (byId.has(workspace.id)) {
        continue;
      }

      byId.set(workspace.id, {
        id: workspace.id,
        name: workspace.displayName ?? null,
        trade: null,
        primaryMailbox: null,
      });
    }

    if (byId.size === 0) {
      // No company could be read. That is not « no company exists », so no
      // list is shown in its place.
      return { kind: 'unknown', message: null };
    }

    return {
      kind: 'reported',
      companies: [...byId.values()],
      activeCompanyId,
      unreadableEntryCount: 0,
    };
  }, [activeCompanyId, availableWorkspaces, currentWorkspace]);

  // The roles, inverted from roles→members into member→roles. A failed read
  // stays 'unknown', so every right reports « inconnu » rather than a refusal.
  const rolesRead = useMemo(
    () =>
      isDefined(rolesError)
        ? ({ kind: 'unknown' } as const)
        : readHermesMemberRolesPayload(rolesData?.getRoles),
    [rolesData, rolesError],
  );

  const membersRead = useMemo<HermesCompanyMembersRead>(() => {
    if (!isDefined(currentWorkspace)) {
      return { kind: 'unknown', message: null };
    }

    const members: HermesCompanyMember[] = currentWorkspaceMembers.map(
      (member) => {
        const firstName = member.name?.firstName?.trim() ?? '';
        const lastName = member.name?.lastName?.trim() ?? '';
        const displayName = [firstName, lastName]
          .filter((part) => part.length > 0)
          .join(' ');

        // Every role the member holds, with its flags. The rights are read
        // from those flags, never from a label: a role called
        // « Administrateur » that carries nothing opens nothing, and a role
        // with an unfamiliar name can be the one that configures the
        // connections.
        //
        // `role` stays null because the three published roles are a vocabulary
        // this product does not use — the native model is additive custom
        // roles — and folding several real roles into one enumerated value
        // would misstate what the person may do.
        const roles = readHermesRolesForMember(rolesRead, member.id);

        return {
          id: member.id,
          companyId: currentWorkspace.id,
          displayName: displayName.length > 0 ? displayName : null,
          email: member.userEmail ?? null,
          role: null,
          unknownRole: null,
          // Not published for a workspace member: there is no active,
          // invited or suspended field on the native object. It stays null
          // rather than being guessed from the roles, which would invent a
          // state the server never reported.
          state: null,
          unknownState: null,
          roles,
        };
      },
    );

    return { kind: 'reported', members, unreadableEntryCount: 0 };
  }, [currentWorkspace, currentWorkspaceMembers, rolesRead]);

  // The capability is the published configuration flag and nothing else. When
  // same-origin selection is off, the control is not rendered at all rather
  // than offered and refused — and a flag nobody set is false, never
  // permission.
  const capability = useMemo<HermesCompanyActionCapability>(
    () =>
      isSameOriginMultiWorkspaceEnabled === true
        ? { kind: 'available' }
        : { kind: 'not-configured' },
    [isSameOriginMultiWorkspaceEnabled],
  );

  // One mapping for both moves: the hook's promise resolving means the native
  // redemption went through, and its rejection carries the server's answer.
  //
  // A success normally never renders — the authentication hook completes by
  // reloading onto the new company — so 'done' is what is shown if it does.
  const applyOutcome = useCallback(
    (
      apply: (state: HermesCompanyActionState) => void,
      companyId: string | null,
      promise: Promise<void>,
    ) => {
      apply({ kind: 'requesting' });

      promise
        .then(() => {
          apply({ kind: 'done', companyId });
        })
        .catch((failure: unknown) => {
          const failureRead = readHermesRuntimeFailure(failure);

          if (failureRead.kind === 'session-replaced') {
            // Session and native cookie no longer agree on user, workspace or
            // membership — typically a switch in another tab. It is an answer:
            // nothing is retried, and a reload is asked for.
            setIsSessionReplaced(true);
            apply({ kind: 'session-replaced', message: failureRead.message });

            return;
          }

          if (failureRead.kind === 'failed') {
            // The call left and no answer could be read. The company may or
            // may not have changed, so neither is claimed.
            apply({ kind: 'unconfirmed' });

            return;
          }

          // A role, quota, session or membership refusal, in the server's own
          // words. Nothing offers to retry it.
          apply({ kind: 'refused', reason: failureRead.message });
        });
    },
    [],
  );

  const requestSwitch = useCallback(
    (companyId: string) => {
      applyOutcome(
        setSwitchState,
        companyId,
        selectWorkspaceOnSameOrigin(companyId),
      );
    },
    [applyOutcome, selectWorkspaceOnSameOrigin],
  );

  const requestAdd = useCallback(
    (displayName: string) => {
      applyOutcome(
        setAddState,
        null,
        createWorkspaceOnSameOrigin(displayName),
      );
    },
    [applyOutcome, createWorkspaceOnSameOrigin],
  );

  return {
    companiesRead,
    membersRead,
    switchCapability: capability,
    switchState,
    addCapability: capability,
    addState,
    activeCompanyId,
    isSessionReplaced,
    hasWriteInFlight:
      switchState.kind === 'requesting' || addState.kind === 'requesting',
    requestSwitch,
    requestAdd,
  };
};
