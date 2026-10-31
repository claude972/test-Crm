import { type Request } from 'express';
import { isDefined } from 'kovaa-lab-shared/utils';
import { ApiPath } from 'kovaa-lab-shared/types';

const NAVIGATION_DESTINATIONS = ['document', 'iframe', 'frame'];

export const isFrontendDocumentRequest = (request: Request): boolean => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false;
  }

  const pathname = request.path;
  const isApiPath = Object.values(ApiPath).some(
    (prefix) => pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`),
  );

  const destination = request.get('Sec-Fetch-Dest');
  // Service-worker forwarding can give a document navigation an empty destination.
  const isForwardedNavigation =
    destination === 'empty' &&
    request.get('Sec-Fetch-Mode') === 'navigate' &&
    request
      .get('Accept')
      ?.split(',')
      .some(
        (mediaRange) =>
          mediaRange.split(';')[0].trim().toLowerCase() === 'text/html',
      ) === true;

  return (
    !isApiPath &&
    request.accepts('html') !== false &&
    (!isDefined(destination) ||
      NAVIGATION_DESTINATIONS.includes(destination) ||
      isForwardedNavigation)
  );
};
