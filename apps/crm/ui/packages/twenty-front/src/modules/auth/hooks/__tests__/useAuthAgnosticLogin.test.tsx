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
const encode = (payload: unknown) =>
  'header.' + btoa(JSON.stringify(payload)).replace(/=/g, '') + '.signature';
// The token a just-signed-up account legitimately holds: purpose LOGIN, and no
// workspace, because it has none yet.
const loginAgnostic = () => encode({ type: 'LOGIN', sub: 'brand-new-user' });
const loginFor = (workspaceId: string, type = 'LOGIN') =>
  encode({ type, workspaceId });

const mockNativeLogin = jest.fn();
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
    return [
      name === 'getauthtokensfromlogintoken' ? mockNativeLogin : jest.fn(),
      {},
    ];
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

describe('same-origin login for an account that has no workspace yet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    resetJotaiStore();
    rotateSessionGeneration();
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    // A brand-new account: no workspace, no user committed to the UI yet.
    jotaiStore.set(currentWorkspaceState.atom, null);
    jotaiStore.set(currentUserState.atom, null);
    jest.mocked(purgeSessionStorage).mockResolvedValue('cleared');
    mockClient.clearStore.mockResolvedValue(undefined);
    mockNativeLogin.mockResolvedValue(nativeLoginResult());
    mockLoadCurrentUser.mockResolvedValue({
      user: { id: 'brand-new-user' },
      workspace: null,
      workspaceMember: null,
    });
  });

  it('redeems a workspace-agnostic LOGIN token so activation is reachable', async () => {
    const { result } = render();
    await act(async () => {
      await result.current.getAuthTokensFromLoginToken(loginAgnostic());
    });
    expect(mockNativeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ loginToken: loginAgnostic() }),
      }),
    );
    // No workspace is asserted, because the account targets none yet.
    expect(mockLoadCurrentUser).toHaveBeenCalledWith({
      expectedWorkspaceId: undefined,
      commitState: false,
    });
    expect(assignLocation).toHaveBeenCalledWith('/');
  });

  it('redeems the token minted for the workspace the account just created', async () => {
    const { result } = render();
    await act(async () => {
      await result.current.getAuthTokensFromLoginToken(loginFor(A), A);
    });
    expect(mockNativeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ loginToken: loginFor(A) }),
      }),
    );
    expect(mockLoadCurrentUser).toHaveBeenCalledWith({
      expectedWorkspaceId: A,
      commitState: false,
    });
    expect(assignLocation).toHaveBeenCalledWith('/');
  });

  it('still refuses a token minted for A when B is the expected workspace', async () => {
    const { result } = render();
    await expect(
      result.current.getAuthTokensFromLoginToken(loginFor(A), B),
    ).rejects.toThrow();
    expect(mockNativeLogin).not.toHaveBeenCalled();
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
  });

  it('still refuses an agnostic token where a specific workspace is expected', async () => {
    const { result } = render();
    await expect(
      result.current.getAuthTokensFromLoginToken(loginAgnostic(), B),
    ).rejects.toThrow();
    expect(mockNativeLogin).not.toHaveBeenCalled();
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong purpose', loginFor(A, 'ACCESS')],
    ['wrong purpose without a workspace', encode({ type: 'ACCESS' })],
    ['a non-uuid workspace', loginFor('not-a-uuid')],
    ['a malformed token', 'not-a-jwt'],
    ['an unparseable payload', 'header.invalid-payload.signature'],
  ])('still refuses %s with no workspace expected', async (_label, token) => {
    const { result } = render();
    await expect(
      result.current.getAuthTokensFromLoginToken(token),
    ).rejects.toThrow();
    expect(mockNativeLogin).not.toHaveBeenCalled();
    expect(mockLoadCurrentUser).not.toHaveBeenCalled();
  });

  it('lets a newer sign-in beat an older in-flight agnostic exchange', async () => {
    let finish!: (value: ReturnType<typeof nativeLoginResult>) => void;
    mockNativeLogin.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = render();
    const pending = result.current.getAuthTokensFromLoginToken(
      loginAgnostic(),
    );
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
});
