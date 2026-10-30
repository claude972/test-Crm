import { act, renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';
import { type DocumentNode, Kind } from 'graphql';
import { useAuth } from '@/auth/hooks/useAuth';
import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';
import { rotateSessionGeneration } from '@/auth/utils/rotateSessionGeneration';
import { purgeSessionStorage } from '@/auth/utils/purgeSessionStorage';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { assignLocation } from '~/utils/assignLocation';

const A = '40d0a08f-24c8-45df-93c1-1c3be8c75d06';
const B = 'd3fecdeb-293a-4890-92d0-a1e133e72167';
const loginFor = (workspaceId: string, type = 'LOGIN') =>
  'header.' +
  btoa(JSON.stringify({ type, workspaceId })).replace(/=/g, '') +
  '.signature';
const mockNativeLogin = jest.fn(),
  mockNativeSignIn = jest.fn(),
  mockCredentials = jest.fn(),
  mockOtp = jest.fn(),
  mockRecovery = jest.fn();
const mockClient = {
  mutate: jest.fn(),
  query: jest.fn(),
  clearStore: jest.fn(),
};
const mockLoadCurrentUser = jest.fn();
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
      getauthtokensfromlogintoken: mockNativeLogin,
      signin: mockNativeSignIn,
      getlogintokenfromcredentials: mockCredentials,
      getauthtokensfromotp: mockOtp,
      getauthtokensfromtwofactorauthenticationrecoverycode: mockRecovery,
    };
    return [handlers[name ?? ''] ?? jest.fn(), {}];
  },
}));
jest.mock('@/users/hooks/useLoadCurrentUser', () => ({
  useLoadCurrentUser: () => ({ loadCurrentUser: mockLoadCurrentUser }),
}));
jest.mock('@/domain-manager/hooks/useOrigin', () => ({
  useOrigin: () => ({ origin: 'https://crm.example.test' }),
}));
jest.mock('@/domain-manager/hooks/useRedirect', () => ({
  useRedirect: () => ({ redirect: jest.fn() }),
}));
jest.mock('@/domain-manager/hooks/useRedirectToWorkspaceDomain', () => ({
  useRedirectToWorkspaceDomain: () => ({
    redirectToWorkspaceDomain: jest.fn(),
  }),
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
const render = () =>
  renderHook(() => useAuth(), {
    wrapper: ({ children }) => (
      <Provider store={jotaiStore}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    ),
  });
const tokenPair = {
  tokens: {
    accessOrWorkspaceAgnosticToken: {
      token: 'native-access-fixture',
      expiresAt: '2100-01-01',
    },
    refreshToken: { token: 'native-refresh-fixture', expiresAt: '2100-01-01' },
  },
};
const nativeLoginResult = () => ({
  data: { getAuthTokensFromLoginToken: tokenPair },
});

describe('same-origin native authentication and workspace transition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    resetJotaiStore();
    rotateSessionGeneration();
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    jotaiStore.set(currentWorkspaceState.atom, { id: A } as never);
    jotaiStore.set(currentUserState.atom, { id: 'synthetic-user' } as never);
    jest.mocked(purgeSessionStorage).mockResolvedValue('cleared');
    mockClient.clearStore.mockResolvedValue(undefined);
    mockNativeLogin.mockResolvedValue(nativeLoginResult());
    mockLoadCurrentUser.mockResolvedValue({
      user: { id: 'synthetic-user' },
      workspace: null,
      workspaceMember: null,
    });
    mockOtp.mockResolvedValue({ data: { getAuthTokensFromOTP: tokenPair } });
    mockRecovery.mockResolvedValue({
      data: {
        getAuthTokensFromTwoFactorAuthenticationRecoveryCode: {
          ...tokenPair,
          provisioningUri: null,
        },
      },
    });
  });
  it('uses native agnostic signIn for credentials instead of the origin-default workspace credential endpoint', async () => {
    mockNativeSignIn.mockResolvedValue({
      data: {
        signIn: {
          availableWorkspaces: {
            availableWorkspacesForSignIn: [{ id: A }, { id: B }],
            availableWorkspacesForSignUp: [],
          },
          ...tokenPair,
        },
      },
    });
    const { result } = render();
    await act(async () => {
      await result.current.signInWithCredentialsInWorkspace(
        'synthetic@example.test',
        'synthetic-password',
      );
    });
    expect(mockNativeSignIn).toHaveBeenCalledTimes(1);
    expect(mockCredentials).not.toHaveBeenCalled();
  });
  it('verifies B with an immutable bootstrap context before purge/reload, without committing a B UI', async () => {
    let finish!: (value: unknown) => void;
    mockLoadCurrentUser.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = render();
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.getAuthTokensFromLoginToken(loginFor(B));
      await Promise.resolve();
    });
    expect(mockLoadCurrentUser).toHaveBeenCalledWith({
      expectedWorkspaceId: B,
      commitState: false,
    });
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(A);
    expect(assignLocation).not.toHaveBeenCalled();
    await act(async () => {
      finish({ user: { id: 'synthetic-user' } });
      await pending;
    });
    expect(assignLocation).toHaveBeenCalledWith('/');
    expect(jotaiStore.get(currentWorkspaceState.atom)).toBeNull();
  });
  it('rejects wrong-purpose or mismatched target intent before a native LOGIN request', async () => {
    const { result } = render();
    await expect(
      result.current.getAuthTokensFromLoginToken(loginFor(B, 'ACCESS')),
    ).rejects.toThrow();
    await expect(
      result.current.getAuthTokensFromLoginToken(loginFor(A), B),
    ).rejects.toThrow();
    expect(mockNativeLogin).not.toHaveBeenCalled();
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
  });
  it('drops an old successful response instead of rotating the later B generation or clearing its state', async () => {
    let finish!: (value: ReturnType<typeof nativeLoginResult>) => void;
    mockNativeLogin.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = render();
    const pending = result.current.getAuthTokensFromLoginToken(loginFor(A));
    rotateSessionGeneration();
    const generation = getSessionGeneration();
    jotaiStore.set(currentWorkspaceState.atom, { id: B } as never);
    finish(nativeLoginResult());
    await expect(pending).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            subCode: 'SESSION_SUPERSEDED',
          }),
        }),
      ],
    });
    expect(getSessionGeneration()).toBe(generation);
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
    expect(assignLocation).not.toHaveBeenCalled();
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(B);
  });
  it('keeps OTP redemption on the target encoded by the existing LOGIN flow', async () => {
    const { result } = render();
    await act(async () => {
      await result.current.getAuthTokensFromOTP('123456', loginFor(B));
    });
    expect(mockOtp).toHaveBeenCalled();
    expect(mockLoadCurrentUser).toHaveBeenCalledWith({
      expectedWorkspaceId: B,
      commitState: false,
    });
    expect(assignLocation).toHaveBeenCalledWith('/');
  });
  it('preserves legitimate recovery provisioning without prematurely rotating or changing workspace', async () => {
    const generation = getSessionGeneration();
    mockRecovery.mockResolvedValue({
      data: {
        getAuthTokensFromTwoFactorAuthenticationRecoveryCode: {
          provisioningUri: 'otpauth://synthetic-provisioning',
        },
      },
    });
    const { result } = render();
    const outcome =
      await result.current.getAuthTokensFromTwoFactorAuthenticationRecoveryCode(
        'synthetic-recovery',
        loginFor(B),
      );
    expect(outcome).toEqual({
      provisioningUri: 'otpauth://synthetic-provisioning',
    });
    expect(getSessionGeneration()).toBe(generation);
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
    expect(assignLocation).not.toHaveBeenCalled();
  });
  it('captures source A once for native selection then redeems only the returned target LOGIN', async () => {
    mockClient.mutate.mockResolvedValue({
      data: {
        selectWorkspaceOnSameOrigin: {
          workspace: { id: B },
          loginToken: { token: loginFor(B) },
        },
      },
    });
    const { result } = render();
    await act(async () => {
      await result.current.selectWorkspaceOnSameOrigin(B);
    });
    expect(mockClient.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { input: { workspaceId: B, expectedWorkspaceId: A } },
        context: { expectedWorkspaceId: A, skipRetry: true },
      }),
    );
    expect(mockNativeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ loginToken: loginFor(B) }),
      }),
    );
    expect(assignLocation).toHaveBeenCalledWith('/');
  });
  it('keeps native creation refusal honest and does not redeem or clear the working source workspace', async () => {
    mockClient.mutate.mockRejectedValue(new Error('Native role/quota refused'));
    const { result } = render();
    await expect(
      result.current.createWorkspaceOnSameOrigin('Synthetic company'),
    ).rejects.toThrow('Native role/quota refused');
    expect(mockNativeLogin).not.toHaveBeenCalled();
    expect(purgeSessionStorage).not.toHaveBeenCalled();
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(A);
  });
  it('does not redeem a minted old selection after the session changed while it was awaiting the server', async () => {
    let finish!: (value: unknown) => void;
    mockClient.mutate.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = render();
    const pending = result.current.selectWorkspaceOnSameOrigin(B);
    rotateSessionGeneration();
    const generation = getSessionGeneration();
    finish({
      data: {
        selectWorkspaceOnSameOrigin: {
          workspace: { id: B },
          loginToken: { token: loginFor(B) },
        },
      },
    });
    await expect(pending).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            subCode: 'SESSION_SUPERSEDED',
          }),
        }),
      ],
    });
    expect(mockNativeLogin).not.toHaveBeenCalled();
    expect(getSessionGeneration()).toBe(generation);
  });
});
