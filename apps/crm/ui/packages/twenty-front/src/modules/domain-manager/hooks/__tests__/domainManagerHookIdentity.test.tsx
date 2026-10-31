import { renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import { useBuildWorkspaceUrl } from '@/domain-manager/hooks/useBuildWorkspaceUrl';
import { useLastAuthenticatedWorkspaceDomain } from '@/domain-manager/hooks/useLastAuthenticatedWorkspaceDomain';
import { useRedirectToWorkspaceDomain } from '@/domain-manager/hooks/useRedirectToWorkspaceDomain';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

// Deliberately unmocked: the point is that the real dependency chain under
// these hooks is stable. Nothing here invokes a redirect.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={jotaiStore}>{children}</Provider>
);

// These three were plain arrows rebuilt every render. Consumers list them in
// dependency arrays, so an unstable identity re-ran their effects every render.
describe('domain-manager hook identities are stable across re-renders', () => {
  beforeEach(() => {
    localStorage.clear();
    resetJotaiStore();
  });

  it.each([
    [
      'buildWorkspaceUrl',
      () => useBuildWorkspaceUrl().buildWorkspaceUrl as unknown,
    ],
    [
      'setLastAuthenticateWorkspaceDomain',
      () =>
        useLastAuthenticatedWorkspaceDomain()
          .setLastAuthenticateWorkspaceDomain as unknown,
    ],
    [
      'redirectToWorkspaceDomain',
      () =>
        useRedirectToWorkspaceDomain().redirectToWorkspaceDomain as unknown,
    ],
  ])('keeps %s identical across three re-renders', (_label, useSubject) => {
    const { result, rerender } = renderHook(useSubject, { wrapper });
    const first = result.current;
    for (let index = 0; index < 3; index += 1) {
      rerender();
      expect(result.current).toBe(first);
    }
  });
});
