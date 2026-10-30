import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import { rotateSessionGeneration } from '@/auth/utils/rotateSessionGeneration';
import { renderHook } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { isAppEffectRedirectEnabledState } from '@/auth/states/isAppEffectRedirectEnabledState';
import { useRedeemSsoExchangeToken } from '@/auth/hooks/useRedeemSsoExchangeToken';
import { isCookieAuthActiveState } from '@/auth/states/isCookieAuthActiveState';
import { clearSessionGeneration } from '@/auth/utils/clearSessionGeneration';
import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';
import { logError } from '~/utils/logError';

import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const mockGetAuthTokensFromSsoExchangeToken = jest.fn();

jest.mock('@apollo/client/react', () => ({
  ...jest.requireActual('@apollo/client/react'),
  useMutation: () => [mockGetAuthTokensFromSsoExchangeToken],
}));

const mockEnqueueToast = jest.fn();

jest.mock('kovaa-lab-ui/components/feedback', () => ({
  ...jest.requireActual('kovaa-lab-ui/components/feedback'),
  useToast: () => ({ enqueueToast: mockEnqueueToast }),
}));

jest.mock('~/utils/logError');

const renderHooks = (
  redeemWorkspaceLoginToken?: (loginToken: string) => Promise<void>,
) => {
  const { result } = renderHook(
    () => useRedeemSsoExchangeToken({ redeemWorkspaceLoginToken }),
    {
      wrapper: ({ children }) => JotaiProvider({ store: jotaiStore, children }),
    },
  );

  return { result };
};

const freshTokenPair = {
  accessOrWorkspaceAgnosticToken: {
    token: 'fresh-access-token',
    expiresAt: '2100-01-01T00:00:00.000Z',
  },
  refreshToken: {
    token: 'fresh-refresh-token',
    expiresAt: '2100-01-01T00:00:00.000Z',
  },
};

describe('useRedeemSsoExchangeToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    clearSessionGeneration();
    resetJotaiStore();

    mockGetAuthTokensFromSsoExchangeToken.mockResolvedValue({
      data: {
        getAuthTokensFromSSOExchangeToken: { tokens: freshTokenPair },
      },
    });
  });

  it('should disable the redirect effect while exchanging and restore it after', async () => {
    const redirectFlagsAtExchangeTime: unknown[] = [];

    mockGetAuthTokensFromSsoExchangeToken.mockImplementation(() => {
      redirectFlagsAtExchangeTime.push(
        jotaiStore.get(isAppEffectRedirectEnabledState.atom),
      );

      return Promise.resolve({
        data: { getAuthTokensFromSSOExchangeToken: { tokens: freshTokenPair } },
      });
    });

    const { result } = renderHooks();

    await result.current.redeemSsoExchangeToken('sso-exchange-token');

    expect(redirectFlagsAtExchangeTime).toEqual([false]);
    expect(jotaiStore.get(isAppEffectRedirectEnabledState.atom)).toBe(true);
  });

  // The cookie is httpOnly, so nothing else tells the client it is signed in.
  it('should mark the session active once the exchange succeeds', async () => {
    const { result } = renderHooks();

    await result.current.redeemSsoExchangeToken('sso-exchange-token');

    expect(jotaiStore.get(isCookieAuthActiveState.atom)).toBe(true);
    expect(getSessionGeneration()).not.toBeNull();
  });

  it('should leave the session inactive when the exchange fails', async () => {
    mockGetAuthTokensFromSsoExchangeToken.mockRejectedValueOnce(
      new Error('Invalid SSO exchange token'),
    );

    const { result } = renderHooks();

    await result.current.redeemSsoExchangeToken('sso-exchange-token');

    expect(jotaiStore.get(isCookieAuthActiveState.atom)).toBe(false);
    expect(getSessionGeneration()).toBeNull();
  });

  it('should toast when redemption fails', async () => {
    mockGetAuthTokensFromSsoExchangeToken.mockRejectedValueOnce(
      new Error('Invalid SSO exchange token'),
    );

    const { result } = renderHooks();

    await result.current.redeemSsoExchangeToken('sso-exchange-token');

    expect(mockEnqueueToast).toHaveBeenCalledWith({
      status: 'error',
      children: 'Authentication failed',
    });
    expect(jotaiStore.get(isAppEffectRedirectEnabledState.atom)).toBe(true);
  });

  it('reports a missing exchange result without showing technical details', async () => {
    mockGetAuthTokensFromSsoExchangeToken.mockResolvedValueOnce({ data: {} });

    const { result } = renderHooks();

    await result.current.redeemSsoExchangeToken('sso-exchange-token');

    expect(jest.mocked(logError)).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'No getAuthTokensFromSSOExchangeToken result',
      }),
    );
    expect(mockEnqueueToast).toHaveBeenCalledWith({
      status: 'error',
      children: 'Authentication failed',
    });
  });
  it('waits for scoped native LOGIN redemption before releasing navigation and never fakes workspace activation', async () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    let finish!: () => void;
    const redeem = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    mockGetAuthTokensFromSsoExchangeToken.mockResolvedValue({
      data: {
        getAuthTokensFromSSOExchangeToken: {
          tokens: freshTokenPair,
          workspaceLoginToken: { token: 'bound-native-login' },
        },
      },
    });
    const { result } = renderHooks(redeem);
    const pending = result.current.redeemSsoExchangeToken('opaque-proof');
    await Promise.resolve();
    await Promise.resolve();
    expect(redeem).toHaveBeenCalledWith('bound-native-login');
    expect(jotaiStore.get(isAppEffectRedirectEnabledState.atom)).toBe(false);
    expect(jotaiStore.get(isCookieAuthActiveState.atom)).toBe(false);
    finish();
    await pending;
    expect(jotaiStore.get(isAppEffectRedirectEnabledState.atom)).toBe(true);
  });
  it('does not activate a scoped workspace when its native LOGIN redemption fails', async () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    mockGetAuthTokensFromSsoExchangeToken.mockResolvedValue({
      data: {
        getAuthTokensFromSSOExchangeToken: {
          workspaceLoginToken: { token: 'refused-native-login' },
        },
      },
    });
    const { result } = renderHooks(
      jest.fn().mockRejectedValue(new Error('Native LOGIN refused')),
    );
    await result.current.redeemSsoExchangeToken('opaque-proof');
    expect(jotaiStore.get(isCookieAuthActiveState.atom)).toBe(false);
    expect(mockEnqueueToast).toHaveBeenCalledWith({
      status: 'error',
      children: 'Authentication failed',
    });
  });
  it('keeps a global native SSO exchange agnostic when no target LOGIN is returned', async () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    const redeem = jest.fn();
    const { result } = renderHooks(redeem);
    await result.current.redeemSsoExchangeToken('global-opaque-proof');
    expect(redeem).not.toHaveBeenCalled();
    expect(jotaiStore.get(isCookieAuthActiveState.atom)).toBe(true);
  });
  it('refuses a target token when no native redemption handler is mounted', async () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    mockGetAuthTokensFromSsoExchangeToken.mockResolvedValue({
      data: {
        getAuthTokensFromSSOExchangeToken: {
          workspaceLoginToken: { token: 'bound-native-login' },
        },
      },
    });
    const { result } = renderHooks();
    await result.current.redeemSsoExchangeToken('opaque-proof');
    expect(jotaiStore.get(isCookieAuthActiveState.atom)).toBe(false);
    expect(mockEnqueueToast).toHaveBeenCalled();
  });
  it('drops a delayed earlier SSO result after another session has won', async () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    rotateSessionGeneration();
    let finish!: (value: unknown) => void;
    mockGetAuthTokensFromSsoExchangeToken.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const redeem = jest.fn();
    const { result } = renderHooks(redeem);
    const pending = result.current.redeemSsoExchangeToken('old-proof');
    rotateSessionGeneration();
    const current = getSessionGeneration();
    finish({
      data: {
        getAuthTokensFromSSOExchangeToken: {
          workspaceLoginToken: { token: 'old-login' },
        },
      },
    });
    await pending;
    expect(redeem).not.toHaveBeenCalled();
    expect(getSessionGeneration()).toBe(current);
  });
});
