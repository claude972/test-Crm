import { getUrlSafely, isDefined } from 'kovaa-lab-shared/utils';

export const isUrlFromProxiedOrigin = (
  url: string,
  proxiedOrigins: string[],
): boolean => {
  const origin = getUrlSafely(url)?.origin;

  return isDefined(origin) && proxiedOrigins.includes(origin);
};
