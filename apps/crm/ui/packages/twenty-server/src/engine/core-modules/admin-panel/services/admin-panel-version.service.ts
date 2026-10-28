import { Injectable, Logger } from '@nestjs/common';

import semver from 'semver';
import * as z from 'zod';

import { type VersionInfoDTO } from 'src/engine/core-modules/admin-panel/dtos/version-info.dto';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';

@Injectable()
export class AdminPanelVersionService {
  private readonly logger = new Logger(AdminPanelVersionService.name);

  constructor(
    private readonly kovaa-labConfigService: KovaaLab CRMConfigService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  async getVersionInfo(): Promise<VersionInfoDTO> {
    const currentVersion = this.kovaa-labConfigService.get('APP_VERSION');

    try {
      const httpClient = this.secureHttpClientService.getHttpClient();

      const rawResponse = await httpClient.get<unknown>(
        'https://hub.docker.com/v2/repositories/kovaa-labcrm/kovaa-lab/tags?page_size=100',
      );
      const response = z
        .object({
          data: z.object({
            results: z.array(z.object({ name: z.string() })),
          }),
        })
        .parse(rawResponse);

      const versions = response.data.results
        .map((tag) => tag.name)
        .filter((name) => name !== 'latest' && semver.valid(name));

      if (versions.length === 0) {
        return { currentVersion, latestVersion: null };
      }

      versions.sort((a, b) => semver.compare(b, a));
      const latestVersion = versions[0];

      return { currentVersion, latestVersion };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch latest version from DockerHub: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { currentVersion, latestVersion: null };
    }
  }
}
