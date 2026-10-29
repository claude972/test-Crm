import { type Request } from 'express';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { resolveAllowedCredentialedOrigins } from 'src/engine/core-modules/user-session/utils/resolve-allowed-credentialed-origins.util';
import { getRequestBaseUrl } from 'src/utils/get-request-base-url.util';

const toComparableOrigin = (value: string): string | undefined => {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return undefined;
  }
};

export const isRequestOriginAllowed = ({
  origin,
  request,
  kovaaLabConfigService,
}: {
  origin: string;
  request: Request;
  kovaaLabConfigService: KovaaLabCRMConfigService;
}): boolean => {
  const normalizedOrigin = origin.toLowerCase();

  // Via URL: browsers omit :443/:80 from Origin while Host keeps the port the client spelled.
  const comparableOrigin = toComparableOrigin(normalizedOrigin);
  const comparableRequestOrigin = toComparableOrigin(
    getRequestBaseUrl(request),
  );

  if (
    isDefined(comparableOrigin) &&
    comparableOrigin === comparableRequestOrigin
  ) {
    return true;
  }

  return resolveAllowedCredentialedOrigins(kovaaLabConfigService).has(
    normalizedOrigin,
  );
};
