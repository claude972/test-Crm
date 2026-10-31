import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, render, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'kovaa-lab-shared/translations';
import { AppPath } from 'kovaa-lab-shared/types';
import { ThemeProvider } from 'kovaa-lab-ui/theme';

import { VerifyEmail } from '@/auth/components/VerifyEmail';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const navigateMock = jest.fn();
const verifyEmailAndGetWorkspaceAgnosticTokenMock = jest.fn();
const verifyEmailAndGetLoginTokenMock = jest.fn();
const verifyLoginTokenMock = jest.fn();
const redirectToWorkspaceDomainMock = jest.fn();

let isOnAWorkspaceValue = false;

jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    verifyEmailAndGetWorkspaceAgnosticToken:
      verifyEmailAndGetWorkspaceAgnosticTokenMock,
    verifyEmailAndGetLoginToken: verifyEmailAndGetLoginTokenMock,
  }),
}));

jest.mock('@/auth/hooks/useVerifyLogin', () => ({
  useVerifyLogin: () => ({ verifyLoginToken: verifyLoginTokenMock }),
}));

jest.mock('@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace', () => ({
  useIsCurrentLocationOnAWorkspace: () => ({
    isOnAWorkspace: isOnAWorkspaceValue,
  }),
}));

jest.mock('@/domain-manager/hooks/useRedirectToWorkspaceDomain', () => ({
  useRedirectToWorkspaceDomain: () => ({
    redirectToWorkspaceDomain: redirectToWorkspaceDomainMock,
  }),
}));

jest.mock('~/hooks/useNavigateApp', () => ({
  useNavigateApp: () => navigateMock,
}));

const mockEnqueueToast = jest.fn();

jest.mock('kovaa-lab-ui/components/feedback', () => ({
  ...jest.requireActual('kovaa-lab-ui/components/feedback'),
  useToast: () => ({ enqueueToast: mockEnqueueToast }),
}));

jest.mock(
  '@/auth/sign-in-up/hooks/useHandleResendEmailVerificationToken',
  () => ({
    useHandleResendEmailVerificationToken: () => ({
      handleResendEmailVerificationToken: () => () => {},
      loading: false,
    }),
  }),
);

dynamicActivate(SOURCE_LOCALE);

const VERIFY_EMAIL_URL =
  '/verify-email?email=user%40example.com&emailVerificationToken=valid-token';

const renderVerifyEmail = (initialEntry: string) =>
  render(
    <JotaiProvider store={jotaiStore}>
      <ThemeProvider colorScheme="light">
        <I18nProvider i18n={i18n}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <VerifyEmail />
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>
    </JotaiProvider>,
  );

describe('VerifyEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    resetJotaiStore();
    isOnAWorkspaceValue = false;
    // The verification effect is gated on the client config having loaded.
    jotaiStore.set(clientConfigApiStatusState.atom, {
      isLoadedOnce: true,
      isLoading: false,
      isErrored: false,
      isSaved: false,
    });
  });

  it('navigates to the SignInUp page after a successful workspace-agnostic verification on the central domain', async () => {
    verifyEmailAndGetWorkspaceAgnosticTokenMock.mockResolvedValue(undefined);

    renderVerifyEmail(VERIFY_EMAIL_URL);

    await waitFor(() => {
      expect(verifyEmailAndGetWorkspaceAgnosticTokenMock).toHaveBeenCalledWith(
        'valid-token',
        'user@example.com',
      );
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(AppPath.SignInUp);
    });
    expect(mockEnqueueToast).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' }),
    );
  });

  it('does not hand off to the SignInUp page when the verification fails', async () => {
    verifyEmailAndGetWorkspaceAgnosticTokenMock.mockRejectedValue(
      new Error('verification failed'),
    );

    renderVerifyEmail(VERIFY_EMAIL_URL);

    await waitFor(() => {
      expect(mockEnqueueToast).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' }),
      );
    });
    expect(navigateMock).not.toHaveBeenCalledWith(AppPath.SignInUp);
  });

  it('keeps the workspace-scoped verification path untouched when already on a workspace', async () => {
    isOnAWorkspaceValue = true;
    verifyEmailAndGetLoginTokenMock.mockResolvedValue({
      loginToken: { token: 'login-token' },
      workspaceUrls: { subdomainUrl: 'https://foo.kovaa-lab.com/' },
    });

    renderVerifyEmail(VERIFY_EMAIL_URL);

    await waitFor(() => {
      expect(verifyEmailAndGetLoginTokenMock).toHaveBeenCalledWith(
        'valid-token',
        'user@example.com',
      );
    });

    expect(verifyEmailAndGetWorkspaceAgnosticTokenMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith(AppPath.SignInUp);
  });

  it('exchanges the login token without redirecting when already on the workspace origin', async () => {
    isOnAWorkspaceValue = true;
    verifyEmailAndGetLoginTokenMock.mockResolvedValue({
      loginToken: { token: 'login-token' },
      workspaceUrls: { subdomainUrl: `${window.location.origin}/` },
    });

    renderVerifyEmail(VERIFY_EMAIL_URL);

    await waitFor(() => {
      expect(verifyLoginTokenMock).toHaveBeenCalledWith('login-token');
    });
    expect(redirectToWorkspaceDomainMock).not.toHaveBeenCalled();
  });
  it('uses the agnostic native verification and picker in same-origin mode even on the canonical workspace host', async () => {
    isOnAWorkspaceValue = true;
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    verifyEmailAndGetWorkspaceAgnosticTokenMock.mockResolvedValue(undefined);
    renderVerifyEmail(VERIFY_EMAIL_URL);
    await waitFor(() =>
      expect(verifyEmailAndGetWorkspaceAgnosticTokenMock).toHaveBeenCalledWith(
        'valid-token',
        'user@example.com',
      ),
    );
    expect(verifyEmailAndGetLoginTokenMock).not.toHaveBeenCalled();
  });
  it('verifies once despite a StrictMode double mount', async () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    verifyEmailAndGetWorkspaceAgnosticTokenMock.mockResolvedValue(undefined);
    render(
      <StrictMode>
        <JotaiProvider store={jotaiStore}>
          <ThemeProvider colorScheme="light">
            <I18nProvider i18n={i18n}>
              <MemoryRouter initialEntries={[VERIFY_EMAIL_URL]}>
                <VerifyEmail />
              </MemoryRouter>
            </I18nProvider>
          </ThemeProvider>
        </JotaiProvider>
      </StrictMode>,
    );
    await waitFor(() =>
      expect(verifyEmailAndGetWorkspaceAgnosticTokenMock).toHaveBeenCalled(),
    );
    expect(verifyEmailAndGetWorkspaceAgnosticTokenMock).toHaveBeenCalledTimes(1);
  });
  it('verifies once when the client config reloads under it', async () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    verifyEmailAndGetWorkspaceAgnosticTokenMock.mockResolvedValue(undefined);
    renderVerifyEmail(VERIFY_EMAIL_URL);
    await waitFor(() =>
      expect(verifyEmailAndGetWorkspaceAgnosticTokenMock).toHaveBeenCalled(),
    );
    // The gate flag going false then true again re-runs the effect body.
    for (const isLoadedOnce of [false, true]) {
      await act(async () => {
        jotaiStore.set(clientConfigApiStatusState.atom, {
          isLoadedOnce,
          isLoading: false,
          isErrored: false,
          isSaved: false,
        });
      });
    }
    expect(verifyEmailAndGetWorkspaceAgnosticTokenMock).toHaveBeenCalledTimes(1);
  });
});
