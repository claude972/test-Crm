import { renderHook } from '@testing-library/react';
import { Provider } from 'jotai';

import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import { useRedirectToWorkspaceDomain } from '@/domain-manager/hooks/useRedirectToWorkspaceDomain';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const ORIGIN = 'https://crm.example.test';
const redirectSpy = jest.fn();

jest.mock('@/domain-manager/hooks/useRedirect', () => ({
  useRedirect: () => ({ redirect: redirectSpy }),
}));
jest.mock('@/domain-manager/hooks/useOrigin', () => ({
  useOrigin: () => ({ origin: ORIGIN }),
}));

const render = () =>
  renderHook(() => useRedirectToWorkspaceDomain(), {
    wrapper: ({ children }) => (
      <Provider store={jotaiStore}>{children}</Provider>
    ),
  });

const configure = ({
  multiWorkspace,
  sameOrigin,
}: {
  multiWorkspace: boolean;
  sameOrigin: boolean;
}) => {
  jotaiStore.set(isMultiWorkspaceEnabledState.atom, multiWorkspace);
  jotaiStore.set(isSameOriginMultiWorkspaceEnabledState.atom, sameOrigin);
};

describe('useRedirectToWorkspaceDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
  });

  it('stays put on a single-domain deployment, as it already did', async () => {
    configure({ multiWorkspace: false, sameOrigin: false });
    const { result } = render();

    await result.current.redirectToWorkspaceDomain(`${ORIGIN}/`, '/verify', {});

    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('routes on the captured origin when the same-origin opt-in is on', async () => {
    configure({ multiWorkspace: false, sameOrigin: true });
    const { result } = render();

    await result.current.redirectToWorkspaceDomain(`${ORIGIN}/`, '/welcome', {
      email: 'synthetic@example.test',
    });

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    const [target] = redirectSpy.mock.calls[0];
    expect(new URL(target).origin).toBe(ORIGIN);
    expect(new URL(target).pathname).toBe('/welcome');
    expect(new URL(target).searchParams.get('email')).toBe(
      'synthetic@example.test',
    );
  });

  it('refuses another host under the same-origin opt-in, which has no second domain to serve it', async () => {
    configure({ multiWorkspace: false, sameOrigin: true });
    const { result } = render();

    await result.current.redirectToWorkspaceDomain(
      'https://elsewhere.example.test/',
      '/verify',
      {},
    );

    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('refuses a target it cannot parse rather than guessing a destination', async () => {
    configure({ multiWorkspace: false, sameOrigin: true });
    const { result } = render();

    await result.current.redirectToWorkspaceDomain('not-a-url', '/verify', {});

    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('keeps the cross-domain redirect intact where domains really exist', async () => {
    configure({ multiWorkspace: true, sameOrigin: false });
    const { result } = render();

    await result.current.redirectToWorkspaceDomain(
      'https://tenant.example.test/',
      '/verify',
      { email: 'synthetic@example.test' },
    );

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(new URL(redirectSpy.mock.calls[0][0]).origin).toBe(
      'https://tenant.example.test',
    );
  });
});
