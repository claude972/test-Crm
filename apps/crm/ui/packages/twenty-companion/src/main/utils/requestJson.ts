import { KovaaLab CRMRequestError } from '../errors/KovaaLab CRMRequestError';

export const requestJson = async <TResponse = unknown>(
  url: string,
  init: RequestInit = {},
): Promise<TResponse> => {
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new KovaaLab CRMRequestError(response.status, url);
  }
  return response.json();
};
