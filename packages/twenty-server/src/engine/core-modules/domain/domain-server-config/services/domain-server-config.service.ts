import { Injectable } from '@nestjs/common';

import { buildUrlWithPathnameAndSearchParams } from 'src/engine/core-modules/domain/domain-server-config/utils/build-url-with-pathname-and-search-params.util';
import { getSubdomainAndCustomDomainFromHostname } from 'src/engine/core-modules/domain/domain-server-config/utils/get-subdomain-and-custom-domain-from-hostname.util';
import { getHostnameFromUrlOrUndefined } from 'src/engine/core-modules/domain/domain-server-config/utils/public-function-domain.util';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Injectable()
export class DomainServerConfigService {
  constructor(private readonly kovaa-labConfigService: KovaaLab CRMConfigService) {}

  getFrontUrl() {
    return new URL(
      this.kovaa-labConfigService.get('FRONTEND_URL') ??
        this.kovaa-labConfigService.get('SERVER_URL'),
    );
  }

  getBaseUrl(): URL {
    const baseUrl = this.getFrontUrl();

    if (
      this.kovaa-labConfigService.get('IS_MULTIWORKSPACE_ENABLED') &&
      this.kovaa-labConfigService.get('DEFAULT_SUBDOMAIN')
    ) {
      baseUrl.hostname = `${this.kovaa-labConfigService.get('DEFAULT_SUBDOMAIN')}.${baseUrl.hostname}`;
    }

    return baseUrl;
  }

  getPublicDomainUrl(): URL {
    return new URL(this.kovaa-labConfigService.get('PUBLIC_DOMAIN_URL'));
  }

  getPublicBaseHostnameOrUndefined(): string | undefined {
    return getHostnameFromUrlOrUndefined(
      this.kovaa-labConfigService.get('PUBLIC_DOMAIN_URL'),
    );
  }

  buildBaseUrl({
    pathname,
    searchParams,
    hash,
  }: {
    pathname?: string;
    searchParams?: Record<string, string | number>;
    hash?: string;
  }) {
    return buildUrlWithPathnameAndSearchParams({
      baseUrl: this.getBaseUrl(),
      pathname,
      searchParams,
      hash,
    });
  }

  getSubdomainAndCustomDomainFromUrl = (url: string) =>
    getSubdomainAndCustomDomainFromHostname({
      hostname: new URL(url).hostname,
      frontDomain: this.getFrontUrl().hostname,
      publicBaseDomain: this.getPublicBaseHostnameOrUndefined(),
      defaultSubdomain: this.kovaa-labConfigService.get('DEFAULT_SUBDOMAIN'),
    });
}
