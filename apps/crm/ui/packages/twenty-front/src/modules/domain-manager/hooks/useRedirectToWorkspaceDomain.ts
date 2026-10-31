import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import { useBuildSearchParamsFromUrlSyncedStates } from '@/domain-manager/hooks/useBuildSearchParamsFromUrlSyncedStates';
import { useBuildWorkspaceUrl } from '@/domain-manager/hooks/useBuildWorkspaceUrl';
import { useOrigin } from '@/domain-manager/hooks/useOrigin';
import { useRedirect } from '@/domain-manager/hooks/useRedirect';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useCallback } from 'react';

// A same-origin deployment has exactly one host, so the only legitimate
// destination is the origin this page is already on. Comparing against the
// captured origin is what keeps that true: it is a host check, not a feature
// check, and anything pointing elsewhere is dropped rather than followed.
const isOnCapturedOrigin = (baseUrl: string, origin: string): boolean => {
  try {
    return new URL(baseUrl).origin === origin;
  } catch {
    return false;
  }
};

export const useRedirectToWorkspaceDomain = () => {
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const isSameOriginMultiWorkspaceEnabled = useAtomStateValue(
    isSameOriginMultiWorkspaceEnabledState,
  );
  const { origin } = useOrigin();
  const { buildWorkspaceUrl } = useBuildWorkspaceUrl();
  const { redirect } = useRedirect();

  const { buildSearchParamsFromUrlSyncedStates } =
    useBuildSearchParamsFromUrlSyncedStates();

  // Memoized: consumers list this in dependency arrays, and a fresh identity
  // every render re-ran their effects. Every dependency below is stable.
  const redirectToWorkspaceDomain = useCallback(
    async (
      baseUrl: string,
      pathname?: string,
      searchParams?: Record<string, string | boolean>,
      target?: string,
    ) => {
      if (!isMultiWorkspaceEnabled) {
        // Without either multi-workspace mode there is no second domain and no
        // workspace routing to perform: staying put is the existing behaviour of
        // the single-domain configuration and is left untouched.
        if (!isSameOriginMultiWorkspaceEnabled) return;
        // With the same-origin opt-in the navigation is legitimate, but only to
        // this very origin. A cross-host target under this configuration is a
        // caller passing a domain that cannot serve this session, so it is
        // refused instead of followed.
        if (!isOnCapturedOrigin(baseUrl, origin)) return;
      }
      redirect(
        buildWorkspaceUrl(baseUrl, pathname, {
          ...searchParams,
          ...(await buildSearchParamsFromUrlSyncedStates()),
        }),
        target,
      );
    },
    [
      isMultiWorkspaceEnabled,
      isSameOriginMultiWorkspaceEnabled,
      origin,
      buildWorkspaceUrl,
      redirect,
      buildSearchParamsFromUrlSyncedStates,
    ],
  );

  return {
    redirectToWorkspaceDomain,
  };
};
