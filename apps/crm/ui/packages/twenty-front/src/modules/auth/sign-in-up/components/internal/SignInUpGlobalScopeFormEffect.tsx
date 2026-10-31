import { useAuth } from '@/auth/hooks/useAuth';
import { useIsLogged } from '@/auth/hooks/useIsLogged';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLoadCurrentUser } from '@/users/hooks/useLoadCurrentUser';
import { useEffect, useRef } from 'react';

export const SignInUpGlobalScopeFormEffect = () => {
  const signInUpStep = useAtomStateValue(signInUpStepState);
  const { navigateAfterMultiWorkspaceSignInUp } = useAuth();
  const { loadCurrentUser } = useLoadCurrentUser();
  const isLogged = useIsLogged();
  // Resuming is for a visitor who arrived already signed in. markSessionActive
  // flips isLogged mid-sign-in while the step is still Init, so without this
  // latch a sign-in on this page starts a second concurrent load here, and the
  // workspace redemption that follows rotates the generation underneath the
  // first one, which then fails as a superseded session.
  // oxlint-disable-next-line kovaa-lab/no-state-useref
  const wasAlreadyLoggedOnMount = useRef(isLogged);

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

    void resumeOnCentralDomain();
  }, [
    loadCurrentUser,
    signInUpStep,
    isLogged,
    navigateAfterMultiWorkspaceSignInUp,
  ]);

  return <></>;
};
