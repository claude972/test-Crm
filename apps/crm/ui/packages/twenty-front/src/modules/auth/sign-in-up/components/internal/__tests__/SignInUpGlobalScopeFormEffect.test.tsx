import { act, render } from '@testing-library/react';
import { Provider } from 'jotai';
import { isCookieAuthActiveState } from '@/auth/states/isCookieAuthActiveState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { SignInUpGlobalScopeFormEffect } from '@/auth/sign-in-up/components/internal/SignInUpGlobalScopeFormEffect';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const mockLoadCurrentUser = jest.fn();
const mockNavigateAfter = jest.fn();
jest.mock('@/users/hooks/useLoadCurrentUser', () => ({
  useLoadCurrentUser: () => ({ loadCurrentUser: mockLoadCurrentUser }),
}));
jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    navigateAfterMultiWorkspaceSignInUp: mockNavigateAfter,
  }),
}));

const renderEffect = () =>
  render(
    <Provider store={jotaiStore}>
      <SignInUpGlobalScopeFormEffect />
    </Provider>,
  );

describe('resuming a session on the global sign-in form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    resetJotaiStore();
    jotaiStore.set(signInUpStepState.atom, SignInUpStep.Init);
    mockLoadCurrentUser.mockResolvedValue({
      user: {
        id: 'synthetic-user',
        email: 'synthetic@example.test',
        availableWorkspaces: { availableWorkspacesForSignIn: [] },
      },
    });
  });

  it('resumes for a visitor who arrived already signed in', async () => {
    jotaiStore.set(isCookieAuthActiveState.atom, true);
    await act(async () => {
      renderEffect();
    });
    expect(mockLoadCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockNavigateAfter).toHaveBeenCalledTimes(1);
  });

  it('does not start a second load when a sign-in on this page marks the session active', async () => {
    jotaiStore.set(isCookieAuthActiveState.atom, false);
    await act(async () => {
      renderEffect();
    });
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
    // What markSessionActive does mid-sign-in, while the step is still Init.
    await act(async () => {
      jotaiStore.set(isCookieAuthActiveState.atom, true);
    });
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
    expect(mockNavigateAfter).not.toHaveBeenCalled();
  });

  it('stays out of the way once the sign-in flow has advanced the step', async () => {
    jotaiStore.set(isCookieAuthActiveState.atom, true);
    jotaiStore.set(signInUpStepState.atom, SignInUpStep.WorkspaceCreation);
    await act(async () => {
      renderEffect();
    });
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
  });
});
