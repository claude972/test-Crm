import { useStore } from 'jotai';
import {
  resetWorkspaceSessionAndReload,
  purgeWorkspaceSessionCache,
} from '@/auth/utils/resetWorkspaceSessionAndReload';
import {
  authSessionSupersededError,
  assertAuthSessionUnchanged,
} from '@/auth/utils/assertAuthSessionUnchanged';
import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import { availableWorkspacesState } from '@/auth/states/availableWorkspacesState';
import { currentUserState } from '@/auth/states/currentUserState';
import { currentUserWorkspaceState } from '@/auth/states/currentUserWorkspaceState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { authProvidersState } from '@/client-config/states/authProvidersState';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { useLastAuthenticatedWorkspaceDomain } from '@/domain-manager/hooks/useLastAuthenticatedWorkspaceDomain';
import { useInitializeFormatPreferences } from '@/localization/hooks/useInitializeFormatPreferences';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { workspaceAuthBypassProvidersState } from '@/workspace/states/workspaceAuthBypassProvidersState';
import { useCallback } from 'react';
import { t } from '@lingui/core/macro';
import { SOURCE_LOCALE, type APP_LOCALES } from 'kovaa-lab-shared/translations';
import { type CurrentUserWorkspaceObjectPermissions } from '@/auth/types/CurrentUserWorkspaceObjectPermissions';
import { isDefined } from 'kovaa-lab-shared/utils';
import { toOpenRecordInPreference } from '@/workspace-member/utils/toOpenRecordInPreference';
import { useApolloClient } from '@apollo/client/react';
import { GetCurrentUserDocument } from '~/generated-metadata/graphql';
import { getWorkspaceUrl } from '~/utils/getWorkspaceUrl';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import { type UiScale } from '@/ui/theme/types/UiScale';

export type LoadCurrentUserOptions = {
  expectedWorkspaceId?: string;
  commitState?: boolean;
};

export const useLoadCurrentUser = () => {
  const store = useStore();
  const isSameOriginMultiWorkspaceEnabled = useAtomStateValue(
    isSameOriginMultiWorkspaceEnabledState,
  );
  const setCurrentUser = useSetAtomState(currentUserState);
  const setAvailableWorkspaces = useSetAtomState(availableWorkspacesState);
  const setCurrentWorkspaceMember = useSetAtomState(
    currentWorkspaceMemberState,
  );
  const { setLastAuthenticateWorkspaceDomain } =
    useLastAuthenticatedWorkspaceDomain();
  const setCurrentUserWorkspace = useSetAtomState(currentUserWorkspaceState);
  const setCurrentWorkspaceMembers = useSetAtomState(
    currentWorkspaceMembersState,
  );
  const setCurrentWorkspace = useSetAtomState(currentWorkspaceState);
  const { initializeFormatPreferences } = useInitializeFormatPreferences();
  const setWorkspaceAuthBypassProviders = useSetAtomState(
    workspaceAuthBypassProvidersState,
  );
  const authProviders = useAtomStateValue(authProvidersState);

  const { isOnAWorkspace } = useIsCurrentLocationOnAWorkspace();

  const client = useApolloClient();

  const loadCurrentUser = useCallback(
    async (options: LoadCurrentUserOptions = {}) => {
      const sessionGeneration = getSessionGeneration();
      const previousWorkspaceId = store.get(currentWorkspaceState.atom)?.id;
      const previousUserId = store.get(currentUserState.atom)?.id;
      const currentUserResult = await client.query({
        query: GetCurrentUserDocument,
        fetchPolicy: isSameOriginMultiWorkspaceEnabled
          ? 'no-cache'
          : 'network-only',
        ...(isSameOriginMultiWorkspaceEnabled && {
          context: {
            expectedWorkspaceId: options.expectedWorkspaceId ?? null,
            skipRetry: true,
            queryDeduplication: false,
          },
        }),
      });

      if (isDefined(currentUserResult.error)) {
        if (isSameOriginMultiWorkspaceEnabled) throw currentUserResult.error;
        throw new Error(currentUserResult.error.message);
      }

      const user = currentUserResult.data?.currentUser;

      if (!isDefined(user)) {
        throw new Error(t`No current user result`);
      }

      if (isSameOriginMultiWorkspaceEnabled) {
        if (
          sessionGeneration !== getSessionGeneration() ||
          (options.expectedWorkspaceId !== undefined &&
            user.currentWorkspace?.id.toLowerCase() !==
              options.expectedWorkspaceId.toLowerCase())
        ) {
          throw authSessionSupersededError();
        }
        if (options.commitState === false)
          return { user, workspaceMember: null, workspace: null };
        // Normalized on both sides, like the supersede check above: a uuid
        // that differs only in case is the same workspace, and treating it as
        // a different one purges the session and reloads for nothing.
        if (
          user.currentWorkspace &&
          ((previousWorkspaceId &&
            previousWorkspaceId.toLowerCase() !==
              user.currentWorkspace.id.toLowerCase()) ||
            (previousUserId &&
              previousUserId.toLowerCase() !== user.id.toLowerCase()))
        ) {
          await resetWorkspaceSessionAndReload({
            client,
            store,
            sessionGeneration,
          });
          return { user, workspaceMember: null, workspace: null };
        }
        if (user.currentWorkspace && !previousWorkspaceId)
          await purgeWorkspaceSessionCache({ client, sessionGeneration });
        assertAuthSessionUnchanged(sessionGeneration);
        client.writeQuery({
          query: GetCurrentUserDocument,
          data: currentUserResult.data,
        });
      }

      let workspaceMember = null;

      setCurrentUser(user);

      if (isDefined(user.workspaceMembers)) {
        setCurrentWorkspaceMembers(user.workspaceMembers);
      }

      if (isDefined(user.availableWorkspaces)) {
        setAvailableWorkspaces(user.availableWorkspaces);
      }

      if (isDefined(user.currentUserWorkspace)) {
        setCurrentUserWorkspace({
          permissionFlags: user.currentUserWorkspace.permissionFlags ?? [],
          twoFactorAuthenticationMethodSummary:
            user.currentUserWorkspace.twoFactorAuthenticationMethodSummary ??
            [],
          objectsPermissions:
            (user.currentUserWorkspace
              .objectsPermissions as CurrentUserWorkspaceObjectPermissions[]) ??
            [],
          isImpersonating: user.currentUserWorkspace.isImpersonating ?? false,
        });
      }

      if (isDefined(user.workspaceMember)) {
        workspaceMember = {
          ...user.workspaceMember,
          colorScheme: user.workspaceMember?.colorScheme as ColorScheme,
          uiScale: user.workspaceMember?.uiScale as UiScale,
          openRecordIn: toOpenRecordInPreference(
            user.workspaceMember?.openRecordIn,
          ),
          locale: user.workspaceMember?.locale ?? SOURCE_LOCALE,
        };

        setCurrentWorkspaceMember(workspaceMember);

        initializeFormatPreferences(workspaceMember);
        dynamicActivate(
          (workspaceMember.locale as keyof typeof APP_LOCALES) ?? SOURCE_LOCALE,
        );
      }

      const workspace = isDefined(user.currentWorkspace)
        ? {
            ...user.currentWorkspace,
            workspaceCustomApplication:
              user.currentWorkspace.workspaceCustomApplication ?? null,
          }
        : null;

      setCurrentWorkspace(workspace);

      if (isDefined(workspace)) {
        setWorkspaceAuthBypassProviders({
          google: authProviders.google && workspace.isGoogleAuthBypassEnabled,
          microsoft:
            authProviders.microsoft && workspace.isMicrosoftAuthBypassEnabled,
          password:
            authProviders.password && workspace.isPasswordAuthBypassEnabled,
        });
      }

      if (isDefined(workspace) && isOnAWorkspace) {
        setLastAuthenticateWorkspaceDomain({
          workspaceId: workspace.id,
          workspaceUrl: getWorkspaceUrl(workspace.workspaceUrls),
        });
      }

      return {
        user,
        workspaceMember,
        workspace,
      };
    },
    [
      client,
      store,
      isSameOriginMultiWorkspaceEnabled,
      setCurrentUser,
      setCurrentWorkspace,
      isOnAWorkspace,
      setCurrentWorkspaceMembers,
      setAvailableWorkspaces,
      setCurrentUserWorkspace,
      setCurrentWorkspaceMember,
      initializeFormatPreferences,
      setLastAuthenticateWorkspaceDomain,
      authProviders,
      setWorkspaceAuthBypassProviders,
    ],
  );

  return {
    loadCurrentUser,
  };
};
