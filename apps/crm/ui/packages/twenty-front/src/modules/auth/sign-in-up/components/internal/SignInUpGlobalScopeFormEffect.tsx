import { useAuth } from '@/auth/hooks/useAuth';
import { useIsLogged } from '@/auth/hooks/useIsLogged';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLoadCurrentUser } from '@/users/hooks/useLoadCurrentUser';
import { useEffect, useRef } from 'react';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

export const SignInUpGlobalScopeFormEffect = () => {
  const signInUpStep = useAtomStateValue(signInUpStepState);
  const { navigateAfterMultiWorkspaceSignInUp } = useAuth();
  const { loadCurrentUser } = useLoadCurrentUser();
  const isLogged = useIsLogged();
  // Resuming is for a visitor who arrived already signed in. markSessionActive
  // flips isLogged mid-sign-in while the step is still Init, so without this
  // latch a sign-in on this page starts a second concurrent load, and the
  // workspace redemption that follows rotates the generation underneath the
  // first one, which then fails as a superseded session.
  // oxlint-disable-next-line kovaa-lab/no-state-useref
  const wasAlreadyLoggedOnMount = useRef(isLogged);
  // Both function dependencies below are rebuilt on every render, so this
  // effect re-runs on every render. Resuming is a one-shot: set before the
  // await, like VerifyLoginTokenEffect, so a re-render cannot start a second.
  // oxlint-disable-next-line kovaa-lab/no-state-useref
  const hasResumed = useRef(false);

  useEffect(() => {
    const resumeOnCentralDomain = async () => {
      const { user } = await loadCurrentUser();
      await navigateAfterMultiWorkspaceSignInUp(
        user.availableWorkspaces,
        user.email,
      );
    };

    if (signInUpStep !== SignInUpStep.Init) return;
    if (!isLogged) return;
    if (!wasAlreadyLoggedOnMount.current) return;
    if (hasResumed.current) return;
    hasResumed.current = true;

    void resumeOnCentralDomain().catch((error: unknown) => {
      // A resume that lost the race to a newer sign-in has nothing to report.
      if (!isGraphqlErrorOfType(error, 'SESSION_SUPERSEDED')) throw error;
    });
  }, [
    loadCurrentUser,
    signInUpStep,
    isLogged,
    navigateAfterMultiWorkspaceSignInUp,
  ]);

  return <></>;
};
