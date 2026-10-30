import { resetWorkspaceSessionAndReload } from '@/auth/utils/resetWorkspaceSessionAndReload';
import { assertAuthSessionUnchanged } from '@/auth/utils/assertAuthSessionUnchanged';
import { t } from '@lingui/core/macro';
import { validate as isUuid } from 'uuid';
import {
  CREATE_WORKSPACE_ON_SAME_ORIGIN,
  SELECT_WORKSPACE_ON_SAME_ORIGIN,
  type SameOriginWorkspaceLogin,
} from '@/auth/graphql/mutations/sameOriginWorkspaces';
import { getLoginTokenWorkspaceIntent } from '@/auth/utils/getLoginTokenWorkspaceIntent';
import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import {
  useApolloClient,
  useLazyQuery,
  useMutation,
} from '@apollo/client/react';
import { useCallback } from 'react';
import { AppPath } from 'kovaa-lab-shared/types';

import { REACT_APP_SERVER_BASE_URL } from '~/config';
import {
  type AuthToken,
  CheckUserExistsDocument,
  GetAuthTokensFromLoginTokenDocument,
  GetAuthTokensFromOtpDocument,
  GetAuthTokensFromTwoFactorAuthenticationRecoveryCodeDocument,
  GetLoginTokenFromCredentialsDocument,
  GetWorkspaceCreationDefaultsDocument,
  SignInDocument,
  SignOutDocument,
  SignUpInWorkspaceDocument,
  SignUpDocument,
  VerifyEmailAndGetLoginTokenDocument,
  VerifyEmailAndGetWorkspaceAgnosticTokenDocument,
} from '~/generated-metadata/graphql';

import { useMarkSessionActive } from '@/auth/hooks/useMarkSessionActive';
import { currentUserState } from '@/auth/states/currentUserState';
import { isCookieAuthActiveState } from '@/auth/states/isCookieAuthActiveState';
import { isPendingServerSignOutState } from '@/auth/states/isPendingServerSignOutState';
import { currentUserWorkspaceState } from '@/auth/states/currentUserWorkspaceState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { returnToPathState } from '@/auth/states/returnToPathState';
import { purgeSessionStorage } from '@/auth/utils/purgeSessionStorage';
import { logError } from '~/utils/logError';
import { broadcastSignOutToOtherTabs } from '@/auth/utils/crossTabSignOut';
import { clearSessionGeneration } from '@/auth/utils/clearSessionGeneration';
import { isValidReturnToPath } from '@/auth/utils/isValidReturnToPath';
import { isNonEmptyString } from '@sniptt/guards';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

import { isAppEffectRedirectEnabledState } from '@/auth/states/isAppEffectRedirectEnabledState';
import { loginTokenState } from '@/auth/states/loginTokenState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import { type BillingCheckoutSession } from '@/auth/types/BillingCheckoutSession';
import {
  countAvailableWorkspaces,
  getFirstAvailableWorkspaces,
} from '@/auth/utils/availableWorkspacesUtils';
import { isEmailVerificationRequiredState } from '@/client-config/states/isEmailVerificationRequiredState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { useLastAuthenticatedWorkspaceDomain } from '@/domain-manager/hooks/useLastAuthenticatedWorkspaceDomain';
import { useOrigin } from '@/domain-manager/hooks/useOrigin';
import { useRedirect } from '@/domain-manager/hooks/useRedirect';
import { useRedirectToWorkspaceDomain } from '@/domain-manager/hooks/useRedirectToWorkspaceDomain';
import { isChooseWorkspaceActionRequested } from '@/auth/utils/isChooseWorkspaceActionRequested';
import { useLoadCurrentUser } from '@/users/hooks/useLoadCurrentUser';
import { i18n } from '@lingui/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isDefined } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';
import { assignLocation } from '~/utils/assignLocation';
import { getWorkspaceUrl } from '~/utils/getWorkspaceUrl';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';
import { useStore } from 'jotai';

export const useAuth = () => {
  const store = useStore();
  const markSessionActive = useMarkSessionActive();
  const setLoginToken = useSetAtomState(loginTokenState);
  const setIsAppEffectRedirectEnabled = useSetAtomState(
    isAppEffectRedirectEnabledState,
  );

  const { origin } = useOrigin();
  const isSameOriginMultiWorkspaceEnabled = useAtomStateValue(
    isSameOriginMultiWorkspaceEnabledState,
  );
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const isEmailVerificationRequired = useAtomStateValue(
    isEmailVerificationRequiredState,
  );
  const { loadCurrentUser } = useLoadCurrentUser();
  const apolloClient = useApolloClient();

  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const { redirect } = useRedirect();
  const { redirectToWorkspaceDomain } = useRedirectToWorkspaceDomain();

  const [getLoginTokenFromCredentials] = useMutation(
    GetLoginTokenFromCredentialsDocument,
  );
  const [signIn] = useMutation(SignInDocument);
  const [signUp] = useMutation(SignUpDocument);
  const [signUpInWorkspace] = useMutation(SignUpInWorkspaceDocument);
  const [getAuthTokensFromLoginToken] = useMutation(
    GetAuthTokensFromLoginTokenDocument,
  );
  const [verifyEmailAndGetLoginToken] = useMutation(
    VerifyEmailAndGetLoginTokenDocument,
  );
  const [verifyEmailAndGetWorkspaceAgnosticToken] = useMutation(
    VerifyEmailAndGetWorkspaceAgnosticTokenDocument,
  );
  const [getAuthTokensFromOtp] = useMutation(GetAuthTokensFromOtpDocument);
  const [getAuthTokensFromTwoFactorAuthenticationRecoveryCode] = useMutation(
    GetAuthTokensFromTwoFactorAuthenticationRecoveryCodeDocument,
  );
  const [signOutMutation] = useMutation(SignOutDocument);

  const workspacePublicData = useAtomStateValue(workspacePublicDataState);

  const { setLastAuthenticateWorkspaceDomain } =
    useLastAuthenticatedWorkspaceDomain();
  const [checkUserExistsQuery, { data: checkUserExistsData }] = useLazyQuery(
    CheckUserExistsDocument,
  );

  const [, setSearchParams] = useSearchParams();

  const navigate = useNavigate();

  const clearSession = useCallback(async () => {
    // The assign below is the only navigation: keep the redirect effect from racing it to the sign-in page.
    store.set(isAppEffectRedirectEnabledState.atom, false);
    sessionStorage.clear();
    store.set(isCookieAuthActiveState.atom, false);
    store.set(currentUserState.atom, null);
    store.set(currentWorkspaceState.atom, null);
    store.set(currentWorkspaceMemberState.atom, null);
    store.set(currentUserWorkspaceState.atom, null);
    clearSessionGeneration();
    setLastAuthenticateWorkspaceDomain(null);

    // The metadata store is an IndexedDB cache of the workspace schema, views
    // and layouts, and it must be gone before we navigate: location.assign
    // interrupts an in-flight transaction, so a fire-and-forget purge could
    // leave it on the device for the next person on this origin. Awaited here,
    // with a bounded wait so a stuck database cannot trap someone signing out.
    const purgeOutcome = await purgeSessionStorage();

    if (purgeOutcome !== 'cleared') {
      // Said plainly rather than swallowed: the local copy may still be there.
      logError(
        new Error(
          `Sign-out could not confirm the metadata cache was cleared: ${purgeOutcome}`,
        ),
      );
    }

    assignLocation(AppPath.SignInUp);
  }, [store, setLastAuthenticateWorkspaceDomain]);

  const navigateAfterMultiWorkspaceSignInUp = useCallback(
    async (
      availableWorkspaces: Parameters<typeof countAvailableWorkspaces>[0],
      email: string,
    ) => {
      const availableWorkspacesCount =
        countAvailableWorkspaces(availableWorkspaces);

      // Set by the in-app "Create Workspace" entry point to skip workspace selection.
      const wantsToCreateNewWorkspace =
        new URLSearchParams(window.location.search).get('action') ===
        'create-new-workspace';

      if (availableWorkspacesCount === 0 || wantsToCreateNewWorkspace) {
        await apolloClient.query({
          query: GetWorkspaceCreationDefaultsDocument,
        });
        setSignInUpStep(SignInUpStep.WorkspaceCreation);
        return;
      }

      if (
        availableWorkspacesCount === 1 &&
        !isChooseWorkspaceActionRequested()
      ) {
        const targetWorkspace =
          getFirstAvailableWorkspaces(availableWorkspaces);

        return await redirectToWorkspaceDomain(
          getWorkspaceUrl(targetWorkspace.workspaceUrls),
          targetWorkspace.loginToken ? AppPath.Verify : AppPath.SignInUp,
          {
            ...(targetWorkspace.loginToken && {
              loginToken: targetWorkspace.loginToken,
            }),
            email,
          },
        );
      }

      setSignInUpStep(SignInUpStep.WorkspaceSelection);
    },
    [apolloClient, redirectToWorkspaceDomain, setSignInUpStep],
  );

  const handleGetLoginTokenFromCredentials = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      try {
        const getLoginTokenResult = await getLoginTokenFromCredentials({
          variables: {
            email,
            password,
            captchaToken,
            origin,
          },
        });
        if (isDefined(getLoginTokenResult.error)) {
          throw getLoginTokenResult.error;
        }

        if (!getLoginTokenResult.data?.getLoginTokenFromCredentials) {
          throw new Error(doNotTranslate('No login token'));
        }

        return getLoginTokenResult.data.getLoginTokenFromCredentials;
      } catch (error) {
        if (isGraphqlErrorOfType(error, 'EMAIL_NOT_VERIFIED')) {
          setSearchParams({ email });
          setSignInUpStep(SignInUpStep.EmailVerification);
          throw error;
        }
        throw error;
      }
    },
    [getLoginTokenFromCredentials, setSearchParams, setSignInUpStep, origin],
  );

  const handleverifyEmailAndGetLoginToken = useCallback(
    async (
      emailVerificationToken: string,
      email: string,
      captchaToken?: string,
    ) => {
      const loginTokenResult = await verifyEmailAndGetLoginToken({
        variables: {
          email,
          emailVerificationToken,
          captchaToken,
          origin,
        },
      });

      if (isDefined(loginTokenResult.error)) {
        throw loginTokenResult.error;
      }

      if (!loginTokenResult.data?.verifyEmailAndGetLoginToken) {
        throw new Error(doNotTranslate('No login token'));
      }

      return loginTokenResult.data.verifyEmailAndGetLoginToken;
    },
    [verifyEmailAndGetLoginToken, origin],
  );

  const handleverifyEmailAndGetWorkspaceAgnosticToken = useCallback(
    async (
      emailVerificationToken: string,
      email: string,
      captchaToken?: string,
    ) => {
      const requestSessionGeneration = getSessionGeneration();
      const { data, error } = await verifyEmailAndGetWorkspaceAgnosticToken({
        variables: {
          email,
          emailVerificationToken,
          captchaToken,
        },
      });

      if (isDefined(error)) {
        throw error;
      }

      if (!data?.verifyEmailAndGetWorkspaceAgnosticToken) {
        throw new Error(
          doNotTranslate('No workspace agnostic token in result'),
        );
      }

      if (isSameOriginMultiWorkspaceEnabled)
        assertAuthSessionUnchanged(requestSessionGeneration);
      markSessionActive();

      const { user } = await loadCurrentUser();

      await navigateAfterMultiWorkspaceSignInUp(
        user.availableWorkspaces,
        user.email,
      );
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      verifyEmailAndGetWorkspaceAgnosticToken,
      markSessionActive,
      loadCurrentUser,
      navigateAfterMultiWorkspaceSignInUp,
    ],
  );

  const handleSetLoginToken = useCallback(
    (token: AuthToken['token']) => {
      setLoginToken(token);
    },
    [setLoginToken],
  );

  const handleLoadWorkspaceAfterAuthentication = useCallback(
    async (loginToken: string) => {
      const expectedWorkspaceId = isSameOriginMultiWorkspaceEnabled
        ? getLoginTokenWorkspaceIntent(loginToken)
        : undefined;
      if (isSameOriginMultiWorkspaceEnabled && !expectedWorkspaceId)
        throw new Error(t`Authentication failed`);
      markSessionActive();
      const sessionGeneration = getSessionGeneration();
      setIsAppEffectRedirectEnabled(false);

      try {
        if (!isSameOriginMultiWorkspaceEnabled) {
          await loadCurrentUser();
          return;
        }
        await loadCurrentUser({ expectedWorkspaceId, commitState: false });
        await resetWorkspaceSessionAndReload({
          client: apolloClient,
          store,
          sessionGeneration,
        });
      } finally {
        setIsAppEffectRedirectEnabled(true);
      }
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      loadCurrentUser,
      markSessionActive,
      setIsAppEffectRedirectEnabled,
      apolloClient,
      store,
    ],
  );

  const handleGetAuthTokensFromLoginToken = useCallback(
    async (loginToken: string, expectedWorkspaceId?: string) => {
      const requestSessionGeneration = getSessionGeneration();
      if (isSameOriginMultiWorkspaceEnabled) {
        const intent = getLoginTokenWorkspaceIntent(loginToken);
        if (
          !intent ||
          (expectedWorkspaceId && intent !== expectedWorkspaceId.toLowerCase())
        )
          throw new Error(t`Authentication failed`);
      }
      try {
        const getAuthTokensResult = await getAuthTokensFromLoginToken({
          variables: {
            loginToken: loginToken,
            origin,
          },
        });

        if (isDefined(getAuthTokensResult.error)) {
          throw getAuthTokensResult.error;
        }

        if (!getAuthTokensResult.data?.getAuthTokensFromLoginToken) {
          throw new Error(
            doNotTranslate('No getAuthTokensFromLoginToken result'),
          );
        }

        if (isSameOriginMultiWorkspaceEnabled)
          assertAuthSessionUnchanged(requestSessionGeneration);
      } catch (error) {
        if (isSameOriginMultiWorkspaceEnabled)
          assertAuthSessionUnchanged(requestSessionGeneration);
        if (
          isGraphqlErrorOfType(
            error,
            'TWO_FACTOR_AUTHENTICATION_PROVISION_REQUIRED',
          )
        ) {
          handleSetLoginToken(loginToken);
          navigate(AppPath.SignInUp);
          setSignInUpStep(SignInUpStep.TwoFactorAuthenticationProvision);
          return;
        }

        if (
          isGraphqlErrorOfType(
            error,
            'TWO_FACTOR_AUTHENTICATION_VERIFICATION_REQUIRED',
          )
        ) {
          handleSetLoginToken(loginToken);
          navigate(AppPath.SignInUp);
          setSignInUpStep(SignInUpStep.TwoFactorAuthenticationVerification);
          return;
        }
        throw error;
      }
      await handleLoadWorkspaceAfterAuthentication(loginToken);
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      handleSetLoginToken,
      getAuthTokensFromLoginToken,
      origin,
      handleLoadWorkspaceAfterAuthentication,
      setSignInUpStep,
      navigate,
    ],
  );

  const handleCredentialsSignIn = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      if (isSameOriginMultiWorkspaceEnabled) {
        const requestSessionGeneration = getSessionGeneration();
        const result = await signIn({
          variables: { email, password, captchaToken },
        });
        if (isDefined(result.error)) throw result.error;
        if (!result.data?.signIn) throw new Error(t`Authentication failed`);
        assertAuthSessionUnchanged(requestSessionGeneration);
        markSessionActive();
        await loadCurrentUser();
        await navigateAfterMultiWorkspaceSignInUp(
          result.data.signIn.availableWorkspaces,
          email,
        );
        return;
      }
      await signIn({
        variables: { email, password, captchaToken },
        onCompleted: async () => {
          markSessionActive();
          const { user } = await loadCurrentUser();

          await navigateAfterMultiWorkspaceSignInUp(
            user.availableWorkspaces,
            user.email,
          );
        },
        onError: (error) => {
          if (isGraphqlErrorOfType(error, 'EMAIL_NOT_VERIFIED')) {
            setSearchParams({ email });
            setSignInUpStep(SignInUpStep.EmailVerification);
            throw error;
          }
          throw error;
        },
      });
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      markSessionActive,
      signIn,
      loadCurrentUser,
      setSearchParams,
      setSignInUpStep,
      navigateAfterMultiWorkspaceSignInUp,
    ],
  );

  const handleCredentialsSignUp = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      const requestSessionGeneration = getSessionGeneration();
      const signUpResult = await signUp({
        variables: {
          email,
          password,
          captchaToken,
          locale: i18n.locale || 'fr-FR',
        },
      });

      if (isDefined(signUpResult.error)) {
        throw signUpResult.error;
      }

      if (isSameOriginMultiWorkspaceEnabled)
        assertAuthSessionUnchanged(requestSessionGeneration);
      if (isEmailVerificationRequired) {
        setSearchParams({ email });
        setSignInUpStep(SignInUpStep.EmailVerification);
        return null;
      }

      if (!signUpResult.data?.signUp) {
        throw new Error(doNotTranslate('No signUp result'));
      }

      markSessionActive();

      const { user } = await loadCurrentUser();

      await navigateAfterMultiWorkspaceSignInUp(
        user.availableWorkspaces,
        user.email,
      );
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      isEmailVerificationRequired,
      setSearchParams,
      markSessionActive,
      signUp,
      loadCurrentUser,
      setSignInUpStep,
      navigateAfterMultiWorkspaceSignInUp,
    ],
  );

  const handleCredentialsSignInInWorkspace = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      if (isSameOriginMultiWorkspaceEnabled)
        return handleCredentialsSignIn(email, password, captchaToken);
      const { loginToken } = await handleGetLoginTokenFromCredentials(
        email,
        password,
        captchaToken,
      );
      await handleGetAuthTokensFromLoginToken(loginToken.token);
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      handleCredentialsSignIn,
      handleGetLoginTokenFromCredentials,
      handleGetAuthTokensFromLoginToken,
    ],
  );

  const selectWorkspaceOnSameOrigin = useCallback(
    async (workspaceId: string) => {
      const requestSessionGeneration = getSessionGeneration();
      const expectedWorkspaceId = store.get(currentWorkspaceState.atom)?.id;
      if (
        !isSameOriginMultiWorkspaceEnabled ||
        !expectedWorkspaceId ||
        !isUuid(workspaceId)
      )
        throw new Error(t`Authentication failed`);
      const result = await apolloClient.mutate<{
        selectWorkspaceOnSameOrigin: SameOriginWorkspaceLogin;
      }>({
        mutation: SELECT_WORKSPACE_ON_SAME_ORIGIN,
        variables: { input: { workspaceId, expectedWorkspaceId } },
        context: { expectedWorkspaceId, skipRetry: true },
      });
      if (isDefined(result.error)) throw result.error;
      const selected = result.data?.selectWorkspaceOnSameOrigin;
      if (!selected || selected.workspace.id !== workspaceId)
        throw new Error(t`Authentication failed`);
      assertAuthSessionUnchanged(requestSessionGeneration);
      await handleGetAuthTokensFromLoginToken(
        selected.loginToken.token,
        workspaceId,
      );
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      store,
      apolloClient,
      handleGetAuthTokensFromLoginToken,
    ],
  );

  const createWorkspaceOnSameOrigin = useCallback(
    async (displayName: string) => {
      const requestSessionGeneration = getSessionGeneration();
      const expectedWorkspaceId = store.get(currentWorkspaceState.atom)?.id;
      if (!isSameOriginMultiWorkspaceEnabled || !expectedWorkspaceId)
        throw new Error(t`Authentication failed`);
      const result = await apolloClient.mutate<{
        createWorkspaceOnSameOrigin: SameOriginWorkspaceLogin;
      }>({
        mutation: CREATE_WORKSPACE_ON_SAME_ORIGIN,
        variables: { input: { displayName, expectedWorkspaceId } },
        context: { expectedWorkspaceId, skipRetry: true },
      });
      if (isDefined(result.error)) throw result.error;
      const created = result.data?.createWorkspaceOnSameOrigin;
      if (!created || !isUuid(created.workspace.id))
        throw new Error(t`Authentication failed`);
      assertAuthSessionUnchanged(requestSessionGeneration);
      await handleGetAuthTokensFromLoginToken(
        created.loginToken.token,
        created.workspace.id,
      );
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      store,
      apolloClient,
      handleGetAuthTokensFromLoginToken,
    ],
  );

  const handleSignOut = useCallback(async () => {
    // Before clearSession, whose navigation kills in-flight requests.
    store.set(isPendingServerSignOutState.atom, true);

    try {
      await signOutMutation();
      store.set(isPendingServerSignOutState.atom, false);
    } catch {}

    broadcastSignOutToOtherTabs();
    await clearSession();
  }, [clearSession, signOutMutation, store]);

  const handleCredentialsSignUpInWorkspace = useCallback(
    async ({
      email,
      password,
      workspaceInviteHash,
      workspacePersonalInviteToken,
      captchaToken,
      verifyEmailRedirectPath,
    }: {
      email: string;
      password: string;
      workspaceInviteHash?: string;
      workspacePersonalInviteToken?: string;
      captchaToken?: string;
      verifyEmailRedirectPath?: string;
    }) => {
      const requestSessionGeneration = getSessionGeneration();
      const signUpInWorkspaceResult = await signUpInWorkspace({
        variables: {
          email,
          password,
          workspaceInviteHash,
          workspacePersonalInviteToken,
          captchaToken,
          locale: i18n.locale || 'fr-FR',
          ...(workspacePublicData?.id
            ? { workspaceId: workspacePublicData.id }
            : {}),
          verifyEmailRedirectPath,
        },
      });

      if (isDefined(signUpInWorkspaceResult.error)) {
        throw signUpInWorkspaceResult.error;
      }

      if (!signUpInWorkspaceResult.data?.signUpInWorkspace) {
        throw new Error(doNotTranslate('No login token'));
      }

      if (isSameOriginMultiWorkspaceEnabled)
        assertAuthSessionUnchanged(requestSessionGeneration);
      if (isEmailVerificationRequired) {
        setSearchParams({ email });
        setSignInUpStep(SignInUpStep.EmailVerification);
        return null;
      }

      if (isMultiWorkspaceEnabled) {
        return await redirectToWorkspaceDomain(
          getWorkspaceUrl(
            signUpInWorkspaceResult.data.signUpInWorkspace.workspace
              .workspaceUrls,
          ),
          isEmailVerificationRequired ? AppPath.SignInUp : AppPath.Verify,
          {
            ...(!isEmailVerificationRequired && {
              loginToken:
                signUpInWorkspaceResult.data.signUpInWorkspace.loginToken.token,
            }),
            email,
          },
        );
      }

      await handleGetAuthTokensFromLoginToken(
        signUpInWorkspaceResult.data?.signUpInWorkspace.loginToken.token,
      );
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      signUpInWorkspace,
      workspacePublicData,
      isMultiWorkspaceEnabled,
      handleGetAuthTokensFromLoginToken,
      setSignInUpStep,
      setSearchParams,
      isEmailVerificationRequired,
      redirectToWorkspaceDomain,
    ],
  );

  const buildRedirectUrl = useCallback(
    (
      path: string,
      params: {
        workspacePersonalInviteToken?: string;
        workspaceInviteHash?: string;
        billingCheckoutSession?: BillingCheckoutSession;
        action?: string;
      },
    ) => {
      const url = new URL(`${REACT_APP_SERVER_BASE_URL}${path}`);
      if (isDefined(params.workspaceInviteHash)) {
        url.searchParams.set('workspaceInviteHash', params.workspaceInviteHash);
      }
      if (isDefined(params.workspacePersonalInviteToken)) {
        url.searchParams.set(
          'inviteToken',
          params.workspacePersonalInviteToken,
        );
      }
      if (isDefined(params.billingCheckoutSession)) {
        url.searchParams.set(
          'billingCheckoutSessionState',
          JSON.stringify(params.billingCheckoutSession),
        );
      }

      if (isDefined(params.action)) {
        url.searchParams.set('action', params.action);
      }

      if (isDefined(workspacePublicData)) {
        url.searchParams.set('workspaceId', workspacePublicData.id);
      }

      const returnToPath = store.get(returnToPathState.atom);

      if (isNonEmptyString(returnToPath) && isValidReturnToPath(returnToPath)) {
        url.searchParams.set('returnToPath', returnToPath);
      }

      return url.toString();
    },
    [workspacePublicData, store],
  );

  const handleGoogleLogin = useCallback(
    (params: {
      workspacePersonalInviteToken?: string;
      workspaceInviteHash?: string;
      billingCheckoutSession?: BillingCheckoutSession;
      action: string;
    }) => {
      redirect(buildRedirectUrl('/auth/google', params));
    },
    [buildRedirectUrl, redirect],
  );

  const handleMicrosoftLogin = useCallback(
    (params: {
      workspacePersonalInviteToken?: string;
      workspaceInviteHash?: string;
      billingCheckoutSession?: BillingCheckoutSession;
      action: string;
    }) => {
      redirect(buildRedirectUrl('/auth/microsoft', params));
    },
    [buildRedirectUrl, redirect],
  );

  const handleGetAuthTokensFromOTP = useCallback(
    async (otp: string, loginToken: string, captchaToken?: string) => {
      const requestSessionGeneration = getSessionGeneration();
      const getAuthTokensFromOtpResult = await getAuthTokensFromOtp({
        variables: {
          captchaToken,
          origin,
          otp,
          loginToken,
        },
      });

      if (isDefined(getAuthTokensFromOtpResult.error)) {
        throw getAuthTokensFromOtpResult.error;
      }

      if (!getAuthTokensFromOtpResult.data?.getAuthTokensFromOTP) {
        throw new Error(doNotTranslate('No getAuthTokensFromOTP result'));
      }

      if (isSameOriginMultiWorkspaceEnabled)
        assertAuthSessionUnchanged(requestSessionGeneration);
      await handleLoadWorkspaceAfterAuthentication(loginToken);
    },
    [
      isSameOriginMultiWorkspaceEnabled,
      getAuthTokensFromOtp,
      origin,
      handleLoadWorkspaceAfterAuthentication,
    ],
  );

  const handleGetAuthTokensFromTwoFactorAuthenticationRecoveryCode =
    useCallback(
      async (
        recoveryCode: string,
        loginToken: string,
        captchaToken?: string,
      ) => {
        const requestSessionGeneration = getSessionGeneration();
        const result =
          await getAuthTokensFromTwoFactorAuthenticationRecoveryCode({
            variables: {
              captchaToken,
              origin,
              recoveryCode,
              loginToken,
            },
          });

        if (isDefined(result.error)) {
          throw result.error;
        }

        const redemption =
          result.data?.getAuthTokensFromTwoFactorAuthenticationRecoveryCode;

        if (!isDefined(redemption)) {
          throw new Error(
            doNotTranslate(
              'No getAuthTokensFromTwoFactorAuthenticationRecoveryCode result',
            ),
          );
        }

        if (isSameOriginMultiWorkspaceEnabled)
          assertAuthSessionUnchanged(requestSessionGeneration);
        if (isDefined(redemption.provisioningUri)) {
          return { provisioningUri: redemption.provisioningUri };
        }

        await handleLoadWorkspaceAfterAuthentication(loginToken);

        return { provisioningUri: null };
      },
      [
        isSameOriginMultiWorkspaceEnabled,
        getAuthTokensFromTwoFactorAuthenticationRecoveryCode,
        origin,
        handleLoadWorkspaceAfterAuthentication,
      ],
    );

  return {
    selectWorkspaceOnSameOrigin,
    createWorkspaceOnSameOrigin,
    getLoginTokenFromCredentials: handleGetLoginTokenFromCredentials,
    verifyEmailAndGetWorkspaceAgnosticToken:
      handleverifyEmailAndGetWorkspaceAgnosticToken,
    verifyEmailAndGetLoginToken: handleverifyEmailAndGetLoginToken,
    getAuthTokensFromLoginToken: handleGetAuthTokensFromLoginToken,
    checkUserExists: { checkUserExistsData, checkUserExistsQuery },
    clearSession,
    signOut: handleSignOut,
    signUpWithCredentials: handleCredentialsSignUp,
    signUpWithCredentialsInWorkspace: handleCredentialsSignUpInWorkspace,
    signInWithCredentialsInWorkspace: handleCredentialsSignInInWorkspace,
    signInWithCredentials: handleCredentialsSignIn,
    signInWithGoogle: handleGoogleLogin,
    signInWithMicrosoft: handleMicrosoftLogin,
    getAuthTokensFromOTP: handleGetAuthTokensFromOTP,
    getAuthTokensFromTwoFactorAuthenticationRecoveryCode:
      handleGetAuthTokensFromTwoFactorAuthenticationRecoveryCode,
    navigateAfterMultiWorkspaceSignInUp,
  };
};
