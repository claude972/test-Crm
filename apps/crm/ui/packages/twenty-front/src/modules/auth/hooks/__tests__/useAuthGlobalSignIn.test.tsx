import { act, renderHook } from '@testing-library/react';
import { type DocumentNode, Kind } from 'graphql';
import { Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '@/auth/hooks/useAuth';
import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { purgeSessionStorage } from '@/auth/utils/purgeSessionStorage';
import { rotateSessionGeneration } from '@/auth/utils/rotateSessionGeneration';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { assignLocation } from '~/utils/assignLocation';

// The deployed preview serves every workspace from one host, so a workspace's
// own base URL is this same origin. That is the configuration in which the
// cross-domain hand-off has nowhere to go.
const ORIGIN = 'https://crm.example.test';
const WORKSPACE_A = '2cda5a32-187b-4d65-a58a-11c3cc2fc1c3';
const WORKSPACE_B = 'd3fecdeb-293a-4890-92d0-a1e133e72167';
const EMAIL = 'synthetic@example.test';
const PASSWORD = 'synthetic-password';

// Synthetic, never a real token: only the workspace intent is read client-side,
// and the native server is what verifies signature, purpose and cookie binding.
const syntheticLoginTokenFor = (workspaceId: string) =>
  'header.' +
  btoa(JSON.stringify({ type: 'LOGIN', workspaceId })).replace(/=/g, '') +
  '.signature';

const availableWorkspace = (workspaceId: string, baseUrl = ORIGIN) => ({
  id: workspaceId,
  displayName: `Workspace ${workspaceId.slice(0, 4)}`,
  loginToken: syntheticLoginTokenFor(workspaceId),
  workspaceUrls: { customUrl: null, subdomainUrl: baseUrl },
});

const redirectSpy = jest.fn();
const mockSignIn = jest.fn();
const mockGetAuthTokensFromLoginToken = jest.fn();
const mockLoadCurrentUser = jest.fn();
const mockClient = {
  mutate: jest.fn(),
  query: jest.fn(),
  clearStore: jest.fn(),
};

jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => mockClient,
  useLazyQuery: () => [jest.fn(), {}],
  useMutation: (document: DocumentNode) => {
    const definition = document.definitions.find(
      (item) => item.kind === Kind.OPERATION_DEFINITION,
    );
    const name =
      definition?.kind === Kind.OPERATION_DEFINITION
        ? definition.name?.value.toLowerCase()
        : '';
    const handlers: Record<string, jest.Mock> = {
      signin: mockSignIn,
      getauthtokensfromlogintoken: mockGetAuthTokensFromLoginToken,
    };
    return [handlers[name ?? ''] ?? jest.fn(), {}];
  },
}));
jest.mock('@/users/hooks/useLoadCurrentUser', () => ({
  useLoadCurrentUser: () => ({ loadCurrentUser: mockLoadCurrentUser }),
}));
jest.mock('@/domain-manager/hooks/useOrigin', () => ({
  useOrigin: () => ({ origin: ORIGIN }),
}));
// useRedirectToWorkspaceDomain is deliberately NOT mocked: the point of these
// tests is what the real routing hook does under each configuration.
jest.mock('@/domain-manager/hooks/useRedirect', () => ({
  useRedirect: () => ({ redirect: redirectSpy }),
}));
jest.mock('@/domain-manager/hooks/useLastAuthenticatedWorkspaceDomain', () => ({
  useLastAuthenticatedWorkspaceDomain: () => ({
    setLastAuthenticateWorkspaceDomain: jest.fn(),
  }),
}));
jest.mock('@/auth/utils/purgeSessionStorage', () => ({
  purgeSessionStorage: jest.fn(),
}));
jest.mock('~/utils/assignLocation', () => ({ assignLocation: jest.fn() }));

const tokenPair = {
  tokens: {
    accessOrWorkspaceAgnosticToken: {
      token: 'synthetic-access',
      expiresAt: '2100-01-01',
    },
    refreshToken: { token: 'synthetic-refresh', expiresAt: '2100-01-01' },
  },
};

const render = () =>
  renderHook(() => useAuth(), {
    wrapper: ({ children }) => (
      <Provider store={jotaiStore}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    ),
  });

const givenGlobalSignInReturns = (
  workspaces: ReturnType<typeof availableWorkspace>[],
) => {
  mockSignIn.mockImplementation(
    async (options?: { onCompleted?: () => unknown }) => {
      // The legacy configuration drives the flow from onCompleted; the
      // same-origin branch reads the returned data. Both are exercised.
      await options?.onCompleted?.();
      return {
        data: {
          signIn: {
            availableWorkspaces: {
              availableWorkspacesForSignIn: workspaces,
              availableWorkspacesForSignUp: [],
            },
            ...tokenPair,
          },
        },
      };
    },
  );
};

describe('global sign-in on a deployment without a second workspace domain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    resetJotaiStore();
    rotateSessionGeneration();
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, false);
    // Global sign-in happens with no workspace in hand: this is exactly the
    // payload the live trace showed, currentWorkspace null included.
    jotaiStore.set(currentWorkspaceState.atom, null);
    jotaiStore.set(currentUserState.atom, null);
    jest.mocked(purgeSessionStorage).mockResolvedValue('cleared');
    mockClient.clearStore.mockResolvedValue(undefined);
    mockGetAuthTokensFromLoginToken.mockResolvedValue({
      data: { getAuthTokensFromLoginToken: tokenPair },
    });
    mockLoadCurrentUser.mockResolvedValue({
      user: { id: 'synthetic-user', email: EMAIL },
      workspace: null,
      workspaceMember: null,
    });
  });

  it('redeems the only workspace in place and reloads, instead of ending in a silent no-op', async () => {
    givenGlobalSignInReturns([availableWorkspace(WORKSPACE_A)]);
    const { result } = render();

    await act(async () => {
      await result.current.signInWithCredentials(EMAIL, PASSWORD);
    });

    // The exchange that the live trace never issued.
    expect(mockGetAuthTokensFromLoginToken).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokensFromLoginToken).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          loginToken: syntheticLoginTokenFor(WORKSPACE_A),
        }),
      }),
    );
    // Verified against the workspace it names, with a no-cache read, before
    // anything treats the person as signed in.
    expect(mockLoadCurrentUser).toHaveBeenCalledWith({
      expectedWorkspaceId: WORKSPACE_A,
      commitState: false,
    });
    // Then the full reload, which is what lets the app boot on whatever the
    // real onboarding status dictates rather than a path chosen here.
    expect(assignLocation).toHaveBeenCalledTimes(1);
    expect(jotaiStore.get(signInUpStepState.atom)).not.toBe(
      SignInUpStep.WorkspaceSelection,
    );
  });

  it('does not leave the sign-in screen motionless: something always happens', async () => {
    givenGlobalSignInReturns([availableWorkspace(WORKSPACE_A)]);
    const { result } = render();

    await act(async () => {
      await result.current.signInWithCredentials(EMAIL, PASSWORD);
    });

    // The regression being guarded: neither an exchange, nor a redirect, nor a
    // step change is what the bug looked like from the outside.
    const didSomething =
      mockGetAuthTokensFromLoginToken.mock.calls.length > 0 ||
      redirectSpy.mock.calls.length > 0;
    expect(didSomething).toBe(true);
  });

  it('offers the picker for several workspaces without redeeming any of them first', async () => {
    givenGlobalSignInReturns([
      availableWorkspace(WORKSPACE_A),
      availableWorkspace(WORKSPACE_B),
    ]);
    const { result } = render();

    await act(async () => {
      await result.current.signInWithCredentials(EMAIL, PASSWORD);
    });

    expect(jotaiStore.get(signInUpStepState.atom)).toBe(
      SignInUpStep.WorkspaceSelection,
    );
    expect(mockGetAuthTokensFromLoginToken).not.toHaveBeenCalled();
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it('redeems in place the workspace chosen from the picker, and reloads', async () => {
    givenGlobalSignInReturns([
      availableWorkspace(WORKSPACE_A),
      availableWorkspace(WORKSPACE_B),
    ]);
    const { result } = render();

    await act(async () => {
      await result.current.signInWithCredentials(EMAIL, PASSWORD);
    });
    expect(jotaiStore.get(signInUpStepState.atom)).toBe(
      SignInUpStep.WorkspaceSelection,
    );

    // What choosing the second entry in SignInUpGlobalScopeForm performs.
    await act(async () => {
      await result.current.signInToAvailableWorkspaceOnSameOrigin(
        availableWorkspace(WORKSPACE_B) as never,
      );
    });

    expect(mockGetAuthTokensFromLoginToken).toHaveBeenCalledTimes(1);
    expect(mockGetAuthTokensFromLoginToken).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          loginToken: syntheticLoginTokenFor(WORKSPACE_B),
        }),
      }),
    );
    expect(mockLoadCurrentUser).toHaveBeenLastCalledWith({
      expectedWorkspaceId: WORKSPACE_B,
      commitState: false,
    });
    expect(assignLocation).toHaveBeenCalledTimes(1);
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('refuses a chosen entry whose token names a different workspace', async () => {
    const { result } = render();

    await expect(
      result.current.signInToAvailableWorkspaceOnSameOrigin({
        ...availableWorkspace(WORKSPACE_A),
        id: WORKSPACE_B,
      } as never),
    ).rejects.toThrow();

    expect(mockGetAuthTokensFromLoginToken).not.toHaveBeenCalled();
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it('refuses a chosen entry that carries no token rather than assuming a session', async () => {
    const { result } = render();

    await expect(
      result.current.signInToAvailableWorkspaceOnSameOrigin({
        ...availableWorkspace(WORKSPACE_A),
        loginToken: null,
      } as never),
    ).rejects.toThrow();

    expect(mockGetAuthTokensFromLoginToken).not.toHaveBeenCalled();
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it('drops a redemption whose session was superseded while the server was answering', async () => {
    let finish!: (value: unknown) => void;
    mockGetAuthTokensFromLoginToken.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = render();

    const pending = result.current.signInToAvailableWorkspaceOnSameOrigin(
      availableWorkspace(WORKSPACE_A) as never,
    );
    rotateSessionGeneration();
    finish({ data: { getAuthTokensFromLoginToken: tokenPair } });

    await expect(pending).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            subCode: 'SESSION_SUPERSEDED',
          }),
        }),
      ],
    });
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
    expect(assignLocation).not.toHaveBeenCalled();
  });
});

describe('global sign-in where workspace domains really exist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    resetJotaiStore();
    rotateSessionGeneration();
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, false);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    jest.mocked(purgeSessionStorage).mockResolvedValue('cleared');
    mockGetAuthTokensFromLoginToken.mockResolvedValue({
      data: { getAuthTokensFromLoginToken: tokenPair },
    });
  });

  it('still hands the only workspace to its own domain', async () => {
    const tenant = 'https://tenant.example.test';
    const workspace = availableWorkspace(WORKSPACE_A, tenant);
    givenGlobalSignInReturns([workspace]);
    mockLoadCurrentUser.mockResolvedValue({
      user: {
        id: 'synthetic-user',
        email: EMAIL,
        availableWorkspaces: {
          availableWorkspacesForSignIn: [workspace],
          availableWorkspacesForSignUp: [],
        },
      },
      workspace: null,
      workspaceMember: null,
    });
    const { result } = render();

    await act(async () => {
      await result.current.signInWithCredentials(EMAIL, PASSWORD);
    });

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    const target = new URL(redirectSpy.mock.calls[0][0]);
    expect(target.origin).toBe(tenant);
    expect(target.pathname).toBe('/verify');
    expect(target.searchParams.get('loginToken')).toBe(
      syntheticLoginTokenFor(WORKSPACE_A),
    );
    // The cross-domain path hands off; it does not redeem here.
    expect(mockGetAuthTokensFromLoginToken).not.toHaveBeenCalled();
  });
});
