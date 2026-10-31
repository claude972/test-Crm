import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';
import { SOURCE_LOCALE } from 'kovaa-lab-shared/translations';
import { ToastProvider } from 'kovaa-lab-ui/components/feedback';
import { ThemeProvider } from 'kovaa-lab-ui/theme';

import { SignInUpGlobalScopeForm } from '@/auth/sign-in-up/components/SignInUpGlobalScopeForm';
import { availableWorkspacesState } from '@/auth/states/availableWorkspacesState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { authProvidersState } from '@/client-config/states/authProvidersState';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const buildWorkspaceUrlMock = jest.fn();
const signOutMock = jest.fn();
const createWorkspaceMock = jest.fn();
const handleResetPasswordMock = jest.fn();
const resetPasswordClickMock = jest.fn();
const signInToAvailableWorkspaceOnSameOriginMock = jest.fn();

jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: signOutMock,
    signInToAvailableWorkspaceOnSameOrigin:
      signInToAvailableWorkspaceOnSameOriginMock,
  }),
}));

jest.mock('@/domain-manager/hooks/useBuildWorkspaceUrl', () => ({
  useBuildWorkspaceUrl: () => ({
    buildWorkspaceUrl: buildWorkspaceUrlMock,
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignUpInNewWorkspace', () => ({
  useSignUpInNewWorkspace: () => ({
    createWorkspace: createWorkspaceMock,
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignInUpForm', () => ({
  useSignInUpForm: () => ({
    form: {
      getValues: () => 'person@example.com',
    },
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useHandleResetPassword', () => ({
  useHandleResetPassword: () => ({
    handleResetPassword: handleResetPasswordMock,
  }),
}));

jest.mock(
  '@/auth/sign-in-up/components/internal/SignInUpWithCredentials',
  () => ({
    SignInUpWithCredentials: () => <div>credentials-form</div>,
  }),
);

jest.mock('@/auth/sign-in-up/components/internal/SignInUpWithGoogle', () => ({
  SignInUpWithGoogle: () => null,
}));

jest.mock(
  '@/auth/sign-in-up/components/internal/SignInUpWithMicrosoft',
  () => ({
    SignInUpWithMicrosoft: () => null,
  }),
);

dynamicActivate(SOURCE_LOCALE);

const WORKSPACE_ID = '2cda5a32-187b-4d65-a58a-11c3cc2fc1c3';
const SYNTHETIC_LOGIN_TOKEN = 'header.synthetic-payload.signature';

const renderForm = () =>
  render(
    <MockedProvider mocks={[]}>
      <JotaiProvider store={jotaiStore}>
        <ThemeProvider colorScheme="light">
          <I18nProvider i18n={i18n}>
            <MemoryRouter>
              <ToastProvider>
                <SignInUpGlobalScopeForm />
              </ToastProvider>
            </MemoryRouter>
          </I18nProvider>
        </ThemeProvider>
      </JotaiProvider>
    </MockedProvider>,
  );

const givenWorkspaceSelectionOf = (
  availableWorkspace: Record<string, unknown>,
) => {
  jotaiStore.set(signInUpStepState.atom, SignInUpStep.WorkspaceSelection);
  jotaiStore.set(availableWorkspacesState.atom, {
    availableWorkspacesForSignIn: [availableWorkspace],
    availableWorkspacesForSignUp: [],
  } as never);
};

const workspaceEntry = (overrides: Record<string, unknown> = {}) => ({
  id: WORKSPACE_ID,
  displayName: 'Recette P0',
  loginToken: SYNTHETIC_LOGIN_TOKEN,
  logo: null,
  workspaceUrls: {
    customUrl: null,
    subdomainUrl: 'https://crm.example.test',
  },
  ...overrides,
});

describe('SignInUpGlobalScopeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
    handleResetPasswordMock.mockReturnValue(resetPasswordClickMock);
    buildWorkspaceUrlMock.mockReturnValue(
      'https://crm.example.test/verify?loginToken=synthetic',
    );
  });

  it('renders forgot-password link on password step and triggers reset callback', () => {
    jotaiStore.set(signInUpStepState.atom, SignInUpStep.Password);
    jotaiStore.set(authProvidersState.atom, {
      google: false,
      magicLink: false,
      microsoft: false,
      password: true,
      sso: [],
    });

    renderForm();

    const forgotPasswordLink = screen.getByText('Forgot your password?');

    expect(forgotPasswordLink).toBeInTheDocument();
    expect(handleResetPasswordMock).toHaveBeenCalledWith('person@example.com');

    fireEvent.click(forgotPasswordLink);

    expect(resetPasswordClickMock).toHaveBeenCalledTimes(1);
  });

  it('redeems the chosen workspace in place on a same-origin deployment', () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    givenWorkspaceSelectionOf(workspaceEntry());

    renderForm();

    fireEvent.click(screen.getByText('Recette P0'));

    expect(signInToAvailableWorkspaceOnSameOriginMock).toHaveBeenCalledTimes(1);
    expect(signInToAvailableWorkspaceOnSameOriginMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: WORKSPACE_ID,
        loginToken: SYNTHETIC_LOGIN_TOKEN,
      }),
    );
    // No link to a domain that is this one.
    expect(screen.getByText('Recette P0').closest('a')).toBeNull();
  });

  it('still links an entry to its own domain where domains exist', () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, false);
    givenWorkspaceSelectionOf(workspaceEntry());

    renderForm();

    fireEvent.click(screen.getByText('Recette P0'));

    expect(signInToAvailableWorkspaceOnSameOriginMock).not.toHaveBeenCalled();
    expect(screen.getByText('Recette P0').closest('a')).not.toBeNull();
  });

  it('leaves a tokenless entry on its link rather than redeeming nothing', () => {
    jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, true);
    givenWorkspaceSelectionOf(workspaceEntry({ loginToken: null }));

    renderForm();

    fireEvent.click(screen.getByText('Recette P0'));

    expect(signInToAvailableWorkspaceOnSameOriginMock).not.toHaveBeenCalled();
    expect(screen.getByText('Recette P0').closest('a')).not.toBeNull();
  });
});
