import { isDefined } from 'kovaa-lab-shared/utils';
import { useCallback } from 'react';
export const useBuildWorkspaceUrl = () => {
  // Memoized: a pure function of its arguments, so a new identity every render
  // only churned the callbacks and effects that depend on it.
  const buildWorkspaceUrl = useCallback((
    endpoint: string,
    pathname?: string,
    searchParams?: Record<string, string | boolean>,
  ) => {
    const url = new URL(endpoint);

    if (isDefined(pathname)) {
      url.pathname = pathname;
    }

    if (isDefined(searchParams)) {
      Object.entries(searchParams).forEach(([key, value]) =>
        url.searchParams.set(key, value.toString()),
      );
    }
    return url.toString();
  }, []);

  return {
    buildWorkspaceUrl,
  };
};
