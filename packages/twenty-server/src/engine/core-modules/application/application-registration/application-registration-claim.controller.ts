import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';

import { Response } from 'express';
import { ApiPath, SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';

import { ApplicationRegistrationClaimService } from 'src/engine/core-modules/application/application-registration/application-registration-claim.service';
import {
  ApplicationRegistrationException,
  ApplicationRegistrationExceptionCode,
} from 'src/engine/core-modules/application/application-registration/application-registration.exception';
import { CustomException } from 'src/utils/custom-exception';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { GuardRedirectService } from 'src/engine/core-modules/guard-redirect/services/guard-redirect.service';
import { KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

// GitHub OAuth callback of the trusted-publishers claim flow. Auth context
// travels in the signed state token, not in a session, hence the public
// endpoint.
@Controller(ApiPath.ApplicationRegistrationClaim)
export class ApplicationRegistrationClaimController {
  constructor(
    private readonly applicationRegistrationClaimService: ApplicationRegistrationClaimService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
    private readonly guardRedirectService: GuardRedirectService,
    private readonly kovaa-labConfigService: KovaaLab CRMConfigService,
  ) {}

  @Get('github/callback')
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async githubCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Res() res: Response,
  ) {
    let workspace: WorkspaceEntity | null = null;

    try {
      const statePayload =
        await this.applicationRegistrationClaimService.verifyClaimState(
          state ?? '',
        );

      workspace =
        await this.applicationRegistrationClaimService.findWorkspaceById(
          statePayload.workspaceId,
        );

      if (oauthError !== undefined || code === undefined) {
        throw new ApplicationRegistrationException(
          'GitHub authorization was denied',
          ApplicationRegistrationExceptionCode.GITHUB_AUTH_FAILED,
        );
      }

      await this.applicationRegistrationClaimService.completeGithubClaim({
        statePayload,
        code,
      });

      if (workspace === null) {
        throw new Error('Workspace not found');
      }

      const url = this.workspaceDomainsService.buildWorkspaceURL({
        workspace,
        pathname: getSettingsPath(SettingsPath.Developers),
      });

      url.hash = 'apps';

      return res.redirect(url.toString());
    } catch (error) {
      const claimErrorCode =
        error instanceof CustomException ? error.code : 'CLAIM_FAILED';

      if (workspace !== null) {
        const url = this.workspaceDomainsService.buildWorkspaceURL({
          workspace,
          pathname: getSettingsPath(SettingsPath.Developers),
        });

        url.searchParams.set('claimErrorCode', claimErrorCode);
        url.hash = 'apps';

        return res.redirect(url.toString());
      }

      return res.redirect(
        this.guardRedirectService.getRedirectErrorUrlAndCaptureExceptions({
          error,
          workspace: {
            subdomain: this.kovaa-labConfigService.get('DEFAULT_SUBDOMAIN'),
            customDomain: null,
          },
          pathname: getSettingsPath(SettingsPath.Developers),
        }),
      );
    }
  }
}
