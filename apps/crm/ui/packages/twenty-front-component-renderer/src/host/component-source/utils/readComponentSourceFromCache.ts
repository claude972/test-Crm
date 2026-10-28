import { isDefined } from 'kovaa-lab-shared/utils';

export const readComponentSourceFromCache = async ({
  cache,
  url,
}: {
  cache: Cache;
  url: string;
}): Promise<string | undefined> => {
  try {
    const cachedResponse = await cache.match(url);

    return isDefined(cachedResponse) ? await cachedResponse.text() : undefined;
  } catch {
    return undefined;
  }
};
