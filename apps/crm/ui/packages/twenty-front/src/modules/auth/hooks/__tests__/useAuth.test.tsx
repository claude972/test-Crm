import { useAuth } from '@/auth/hooks/useAuth';

import { purgeSessionStorage } from '@/auth/utils/purgeSessionStorage';
import { assignLocation } from '~/utils/assignLocation';
import { logError } from '~/utils/logError';

import { MockedProvider } from '@apollo/client/testing/react';
import { type ReactNode, act } from 'react';
import { MemoryRouter } from 'react-router-dom';

import {
  email,
  mocks,
  password,
  results,
  token,
} from '@/auth/hooks/__mocks__/useAuth';
import {
  type CurrentUser,
  currentUserState,
} from '@/auth/states/currentUserState';
import {
  type CurrentWorkspace,
  currentWorkspaceState,
} from '@/auth/states/currentWorkspaceState';
import { returnToPathState } from '@/auth/states/returnToPathState';
import { renderHook } from '@testing-library/react';
import { getDefaultStore } from 'jotai';
import { AppPath } from 'kovaa-lab-shared/types';
import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';
import { ToastProvider } from 'kovaa-lab-ui/components/feedback';

const redirectSpy = jest.fn();

jest.mock('@/domain-manager/hooks/useRedirect', () => ({
  useRedirect: jest.fn().mockImplementation(() => ({
    redirect: redirectSpy,
  })),
}));

jest.mock('@/domain-manager/hooks/useOrigin', () => ({
  useOrigin: jest.fn().mockImplementation(() => ({
    origin: 'http://localhost',
  })),
}));

jest.mock('@/captcha/hooks/useRequestFreshCaptchaToken', () => ({
  useRequestFreshCaptchaToken: jest.fn().mockImplementation(() => ({
    requestFreshCaptchaToken: jest.fn(),
  })),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignUpInNewWorkspace', () => ({
  useSignUpInNewWorkspace: jest.fn().mockImplementation(() => ({
    createWorkspace: jest.fn(),
  })),
}));

jest.mock('@/domain-manager/hooks/useRedirectToWorkspaceDomain', () => ({
  useRedirectToWorkspaceDomain: jest.fn().mockImplementation(() => ({
    redirectToWorkspaceDomain: jest.fn(),
  })),
}));

jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace', () => ({
  useIsCurrentLocationOnAWorkspace: jest.fn().mockImplementation(() => ({
    isOnAWorkspace: true,
  })),
}));

jest.mock('@/domain-manager/hooks/useLastAuthenticatedWorkspaceDomain', () => ({
  useLastAuthenticatedWorkspaceDomain: jest.fn().mockImplementation(() => ({
    setLastAuthenticateWorkspaceDomain: jest.fn(),
  })),
}));

jest.mock('@/auth/utils/purgeSessionStorage', () => ({
  purgeSessionStorage: jest.fn(),
}));
jest.mock('~/utils/assignLocation');
jest.mock('~/utils/logError');

const mockedPurgeSessionStorage = jest.mocked(purgeSessionStorage);
const mockedAssignLocation = jest.mocked(assignLocation);
const mockedLogError = jest.mocked(logError);

// window.location is non-configurable in jsdom, so the navigation is observed
// at its own module boundary instead. Recording into a shared array is what
// lets the ordering be asserted rather than assumed: the whole point of the
// fix is that the purge finishes first.
const navigationOrder: string[] = [];

const Wrapper = ({ children }: { children: ReactNode }) => (
  <MockedProvider mocks={Object.values(mocks)}>
    <MemoryRouter>
      <ToastProvider>{children}</ToastProvider>
    </MemoryRouter>
  </MockedProvider>
);

const renderHooks = () => {
  const { result } = renderHook(
    () => {
      return useAuth();
    },
    {
      wrapper: Wrapper,
    },
  );
  return { result };
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigationOrder.length = 0;
    mockedAssignLocation.mockImplementation(() => {
      navigationOrder.push('navigate');
    });
    mockedPurgeSessionStorage.mockResolvedValue('cleared');
    getDefaultStore().set(returnToPathState.atom, '');
  });

  it('should return login token object', async () => {
    const { result } = renderHooks();

    await act(async () => {
      expect(
        await result.current.getLoginTokenFromCredentials(email, password),
      ).toStrictEqual(results.getLoginTokenFromCredentials);
    });

    expect(mocks.getLoginTokenFromCredentials.result).toHaveBeenCalled();
  });

  it('should verify user', async () => {
    const { result } = renderHooks();

    await act(async () => {
      await result.current.getAuthTokensFromLoginToken(token);
    });

    expect(mocks.getAuthTokensFromLoginToken.result).toHaveBeenCalled();
    expect(mocks.getCurrentUser.result).toHaveBeenCalled();
  });

  it('should handle credential sign-in', async () => {
    const { result } = renderHooks();

    await act(async () => {
      await result.current.signInWithCredentialsInWorkspace(email, password);
    });

    expect(mocks.getLoginTokenFromCredentials.result).toHaveBeenCalled();
    expect(mocks.getAuthTokensFromLoginToken.result).toHaveBeenCalled();
  });

  it('should handle google sign-in', async () => {
    const { result } = renderHooks();

    await act(async () => {
      await result.current.signInWithGoogle({
        workspaceInviteHash: 'workspaceInviteHash',
        action: 'join-workspace',
      });
    });

    expect(redirectSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '/auth/google?workspaceInviteHash=workspaceInviteHash',
      ),
    );
  });

  it('should forward returnToPath to /auth/google when set in state', async () => {
    getDefaultStore().set(
      returnToPathState.atom,
      '/authorize?response_type=code&client_id=abc&state=xyz',
    );

    const { result } = renderHooks();

    await act(async () => {
      await result.current.signInWithGoogle({
        action: 'list-available-workspaces',
      });
    });

    const calledWithUrl = redirectSpy.mock.calls[0]?.[0] as string;
    const parsed = new URL(calledWithUrl);

    expect(parsed.pathname).toBe('/auth/google');
    expect(parsed.searchParams.get('action')).toBe('list-available-workspaces');
    expect(parsed.searchParams.get('returnToPath')).toBe(
      '/authorize?response_type=code&client_id=abc&state=xyz',
    );
  });

  it('should not forward an invalid (protocol-relative) returnToPath', async () => {
    getDefaultStore().set(returnToPathState.atom, '//evil.example.com');

    const { result } = renderHooks();

    await act(async () => {
      await result.current.signInWithGoogle({
        action: 'list-available-workspaces',
      });
    });

    const calledWithUrl = redirectSpy.mock.calls[0]?.[0] as string;
    const parsed = new URL(calledWithUrl);

    expect(parsed.searchParams.has('returnToPath')).toBe(false);
  });

  it('should handle sign-out', async () => {
    sessionStorage.setItem('lingering-key', 'should-be-cleared');
    getDefaultStore().set(currentWorkspaceState.atom, {
      id: 'workspace-id',
      activationStatus: WorkspaceActivationStatus.SUSPENDED,
    } as CurrentWorkspace);
    getDefaultStore().set(currentUserState.atom, {
      id: 'user-id',
    } as CurrentUser);

    const { result } = renderHooks();

    await act(async () => {
      result.current.signOut();
    });

    expect(sessionStorage.length).toBe(0);
    expect(getDefaultStore().get(currentWorkspaceState.atom)).toBeNull();
    expect(getDefaultStore().get(currentUserState.atom)).toBeNull();
  });

  it('finishes the storage purge before navigating away', async () => {
    mockedPurgeSessionStorage.mockImplementation(async () => {
      // A microtask boundary, so a fire-and-forget call would let the
      // navigation overtake the purge and the assertion below would catch it.
      await Promise.resolve();
      navigationOrder.push('purge');

      return 'cleared';
    });

    const { result } = renderHooks();

    await act(async () => {
      await result.current.signOut();
    });

    expect(navigationOrder).toEqual(['purge', 'navigate']);
  });

  it('still signs the user out, and says so, when the purge cannot be confirmed', async () => {
    mockedPurgeSessionStorage.mockResolvedValue('not-confirmed');

    const { result } = renderHooks();

    await act(async () => {
      await result.current.signOut();
    });

    // Leaving must never be blocked by a stuck database, and the unconfirmed
    // wipe must not pass silently either.
    expect(mockedAssignLocation).toHaveBeenCalledWith(AppPath.SignInUp);
    expect(mockedLogError).toHaveBeenCalled();
  });

  it('reports a failed purge rather than treating it as a success', async () => {
    mockedPurgeSessionStorage.mockResolvedValue('failed');

    const { result } = renderHooks();

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockedLogError).toHaveBeenCalled();
    expect(mockedAssignLocation).toHaveBeenCalledWith(AppPath.SignInUp);
  });

  it('should handle credential sign-up', async () => {
    const { result } = renderHooks();

    await act(async () => {
      await result.current.signUpWithCredentialsInWorkspace({
        email,
        password,
      });
    });

    expect(mocks.signUpInWorkspace.result).toHaveBeenCalled();
  });
});
