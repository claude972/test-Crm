import { act, render } from '@testing-library/react';
import { Provider } from 'jotai';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
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
// Both hooks rebuild their functions on every render in production, so the
// mocks do too: a stable identity here would hide the re-fire this guards.
jest.mock('@/users/hooks/useLoadCurrentUser', () => ({
  useLoadCurrentUser: () => ({
    loadCurrentUser: (...args: unknown[]) => mockLoadCurrentUser(...args),
  }),
}));
jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    navigateAfterMultiWorkspaceSignInUp: (...args: unknown[]) =>
      mockNavigateAfter(...args),
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

  it('resumes once for a visitor who arrived already signed in', async () => {
    jotaiStore.set(isCookieAuthActiveState.atom, true);
    await act(async () => {
      renderEffect();
    });
    expect(mockLoadCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockNavigateAfter).toHaveBeenCalledTimes(1);
  });

  it('resumes only once across re-renders that rebuild its dependencies', async () => {
    jotaiStore.set(isCookieAuthActiveState.atom, true);
    let rerender!: (ui: React.ReactElement) => void;
    await act(async () => {
      ({ rerender } = renderEffect());
    });
    for (let index = 0; index < 3; index += 1) {
      await act(async () => {
        rerender(
          <Provider store={jotaiStore}>
            <SignInUpGlobalScopeFormEffect />
          </Provider>,
        );
      });
    }
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

  it('swallows a resume that lost the race but still reports other failures', async () => {
    jotaiStore.set(isCookieAuthActiveState.atom, true);
    mockLoadCurrentUser.mockRejectedValue(
      new CombinedGraphQLErrors({
        errors: [
          {
            message: 'Authentication failed',
            extensions: {
              code: 'UNAUTHENTICATED',
              subCode: 'SESSION_SUPERSEDED',
            },
          },
        ],
      }),
    );
    const rejections: unknown[] = [];
    const onRejection = (event: PromiseRejectionEvent) => {
      rejections.push(event.reason);
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', onRejection);
    try {
      await act(async () => {
        renderEffect();
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(rejections).toHaveLength(0);
    } finally {
      window.removeEventListener('unhandledrejection', onRejection);
    }
  });
});
