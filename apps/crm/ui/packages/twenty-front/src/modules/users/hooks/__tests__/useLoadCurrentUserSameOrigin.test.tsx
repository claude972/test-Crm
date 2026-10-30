import { ApolloClient, InMemoryCache } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { GetCurrentUserDocument } from '~/generated-metadata/graphql';
import { renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';
import { rotateSessionGeneration } from '@/auth/utils/rotateSessionGeneration';
import {
  resetWorkspaceSessionAndReload,
  purgeWorkspaceSessionCache,
} from '@/auth/utils/resetWorkspaceSessionAndReload';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { useLoadCurrentUser } from '@/users/hooks/useLoadCurrentUser';

const A = '40d0a08f-24c8-45df-93c1-1c3be8c75d06';
const B = 'd3fecdeb-293a-4890-92d0-a1e133e72167';
const mockClient = {
  query: jest.fn(),
  writeQuery: jest.fn(),
  clearStore: jest.fn(),
};
jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => mockClient,
}));
jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace', () => ({
  useIsCurrentLocationOnAWorkspace: () => ({ isOnAWorkspace: false }),
}));
jest.mock('@/domain-manager/hooks/useLastAuthenticatedWorkspaceDomain', () => ({
  useLastAuthenticatedWorkspaceDomain: () => ({
    setLastAuthenticateWorkspaceDomain: jest.fn(),
  }),
}));
jest.mock('@/localization/hooks/useInitializeFormatPreferences', () => ({
  useInitializeFormatPreferences: () => ({
    initializeFormatPreferences: jest.fn(),
  }),
}));
jest.mock('~/utils/i18n/dynamicActivate', () => ({
  dynamicActivate: jest.fn(),
}));
jest.mock('@/auth/utils/resetWorkspaceSessionAndReload', () => ({
  resetWorkspaceSessionAndReload: jest.fn().mockResolvedValue(undefined),
  purgeWorkspaceSessionCache: jest.fn().mockResolvedValue(undefined),
}));
const resultData = (workspaceId: string) => ({
  data: {
    currentUser: {
      __typename: 'User',
      id: 'synthetic-user',
      email: 'synthetic@example.test',
      currentWorkspace: { __typename: 'Workspace', id: workspaceId },
      workspaceMembers: [],
    },
  },
});
const render = () =>
  renderHook(() => useLoadCurrentUser(), {
    wrapper: ({ children }) => (
      <Provider store={jotaiStore}>{children}</Provider>
    ),
  });

describe('verified current-user bootstrap before cache or tenant state changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    resetJotaiStore();
    rotateSessionGeneration();
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    jotaiStore.set(currentWorkspaceState.atom, { id: A } as never);
    jotaiStore.set(currentUserState.atom, { id: 'synthetic-user' } as never);
    mockClient.query.mockResolvedValue(resultData(B));
  });
  it('pins B on the bootstrap operation and verifies without committing B before reload', async () => {
    const { result } = render();
    await result.current.loadCurrentUser({
      expectedWorkspaceId: B,
      commitState: false,
    });
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchPolicy: 'no-cache',
        context: {
          expectedWorkspaceId: B,
          skipRetry: true,
          queryDeduplication: false,
        },
      }),
    );
    expect(mockClient.writeQuery).not.toHaveBeenCalled();
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(A);
    expect(resetWorkspaceSessionAndReload).not.toHaveBeenCalled();
  });
  it('uses an explicit omitted-header bootstrap when the verified cookie workspace is not yet known', async () => {
    const { result } = render();
    await result.current.loadCurrentUser({ commitState: false });
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          expectedWorkspaceId: null,
          skipRetry: true,
          queryDeduplication: false,
        },
      }),
    );
  });
  it('refuses the wrong workspace before updating any cache or state', async () => {
    mockClient.query.mockResolvedValue(resultData(A));
    const { result } = render();
    await expect(
      result.current.loadCurrentUser({ expectedWorkspaceId: B }),
    ).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            subCode: 'SESSION_SUPERSEDED',
          }),
        }),
      ],
    });
    expect(mockClient.writeQuery).not.toHaveBeenCalled();
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(A);
  });
  it('discards a delayed A response after a later session generation before cache/state writes', async () => {
    let finish!: (value: ReturnType<typeof resultData>) => void;
    mockClient.query.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = render();
    const pending = result.current.loadCurrentUser({ expectedWorkspaceId: A });
    rotateSessionGeneration();
    finish(resultData(A));
    await expect(pending).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          extensions: expect.objectContaining({
            subCode: 'SESSION_SUPERSEDED',
          }),
        }),
      ],
    });
    expect(mockClient.writeQuery).not.toHaveBeenCalled();
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(A);
  });
  it('reloads before committing a different cookie workspace over persisted A on cold bootstrap', async () => {
    const generation = getSessionGeneration();
    const { result } = render();
    await result.current.loadCurrentUser();
    expect(resetWorkspaceSessionAndReload).toHaveBeenCalledWith({
      client: mockClient,
      store: jotaiStore,
      sessionGeneration: generation,
    });
    expect(mockClient.writeQuery).not.toHaveBeenCalled();
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(A);
  });
  it('purges unknown persistent metadata before committing verified B on a fresh context', async () => {
    jotaiStore.set(currentWorkspaceState.atom, null);
    jotaiStore.set(currentUserState.atom, null);
    const { result } = render();
    await result.current.loadCurrentUser({ expectedWorkspaceId: B });
    expect(purgeWorkspaceSessionCache).toHaveBeenCalledTimes(1);
    expect(mockClient.writeQuery).toHaveBeenCalledTimes(1);
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(B);
  });
  it('preserves legacy network-only loading with the feature disabled', async () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, false);
    const { result } = render();
    await result.current.loadCurrentUser();
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({ fetchPolicy: 'network-only' }),
    );
    expect(mockClient.query.mock.calls[0][0].context).toBeUndefined();
    expect(resetWorkspaceSessionAndReload).not.toHaveBeenCalled();
    expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(B);
  });
  it('never commits B over an unknown persistent cache when the cold-start purge fails', async () => {
    jotaiStore.set(currentWorkspaceState.atom, null);
    jotaiStore.set(currentUserState.atom, null);
    jest
      .mocked(purgeWorkspaceSessionCache)
      .mockRejectedValueOnce(new Error('Purge unconfirmed'));
    const { result } = render();
    await expect(
      result.current.loadCurrentUser({ expectedWorkspaceId: B }),
    ).rejects.toThrow('Purge unconfirmed');
    expect(mockClient.writeQuery).not.toHaveBeenCalled();
    expect(jotaiStore.get(currentWorkspaceState.atom)).toBeNull();
  });
  it('uses two real Apollo/MockLink requests and discards delayed A instead of deduplicating B onto A', async () => {
    jest.useFakeTimers();
    const link = new MockLink([
      {
        request: { query: GetCurrentUserDocument, variables: {} },
        result: resultData(A),
        delay: 100,
      },
      {
        request: { query: GetCurrentUserDocument, variables: {} },
        result: resultData(B),
        delay: 0,
      },
    ]);
    const requested = jest.spyOn(link, 'request');
    const client = new ApolloClient({
      link,
      cache: new InMemoryCache(),
      queryDeduplication: true,
    });
    mockClient.query.mockImplementation((options) => client.query(options));
    mockClient.writeQuery.mockImplementation((options) =>
      client.writeQuery(options),
    );
    try {
      const { result } = render();
      const first = result.current.loadCurrentUser({ expectedWorkspaceId: A });
      const firstRejected = expect(first).rejects.toMatchObject({
        errors: [
          expect.objectContaining({
            extensions: expect.objectContaining({
              subCode: 'SESSION_SUPERSEDED',
            }),
          }),
        ],
      });
      rotateSessionGeneration();
      jotaiStore.set(currentWorkspaceState.atom, null);
      jotaiStore.set(currentUserState.atom, null);
      const second = result.current.loadCurrentUser({ expectedWorkspaceId: B });
      await jest.advanceTimersByTimeAsync(0);
      await second;
      expect(requested).toHaveBeenCalledTimes(2);
      expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(B);
      await jest.advanceTimersByTimeAsync(100);
      await firstRejected;
      expect(jotaiStore.get(currentWorkspaceState.atom)?.id).toBe(B);
      const cached = JSON.stringify(client.cache.extract());
      expect(cached).toContain(B);
      expect(cached).not.toContain(A);
    } finally {
      client.stop();
      jest.useRealTimers();
    }
  });
});
