import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';

import { type Request } from 'express';
import { ApiPath } from 'kovaa-lab-shared/types';

import { buildApiCatalog } from 'src/engine/core-modules/well-known/utils/build-api-catalog.util';
import { buildMcpServerCard } from 'src/engine/core-modules/well-known/utils/build-mcp-server-card.util';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { getRequestBaseUrl } from 'src/utils/get-request-base-url.util';
import { extractVersionMajorMinorPatch } from 'src/utils/version/extract-version-major-minor-patch';

const DISCOVERY_CACHE_CONTROL = 'public, max-age=3600';
const FALLBACK_SERVER_VERSION = '0.0.0';

@Controller(ApiPath.WellKnown)
export class WellKnownController {
  constructor(private readonly kovaa-labConfigService: KovaaLab CRMConfigService) {}

  @Get('mcp/server-card.json')
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  @Header('Cache-Control', DISCOVERY_CACHE_CONTROL)
  getMcpServerCard(@Req() request: Request) {
    const version =
      extractVersionMajorMinorPatch(
        this.kovaa-labConfigService.get('APP_VERSION'),
      ) ?? FALLBACK_SERVER_VERSION;

    return buildMcpServerCard({
      baseUrl: getRequestBaseUrl(request),
      version,
    });
  }

  // Return a string so Nest keeps the explicit linkset+json Content-Type.
  @Get('api-catalog')
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  @Header(
    'Content-Type',
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  )
  @Header('Cache-Control', DISCOVERY_CACHE_CONTROL)
  getApiCatalog(@Req() request: Request): string {
    return JSON.stringify(buildApiCatalog(getRequestBaseUrl(request)), null, 2);
  }
}
