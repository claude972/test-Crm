import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  HermesAuthorizedStructureDTO,
  HermesStructureDashboardDTO,
} from 'src/engine/core-modules/workspace/structure-dashboard/dtos/hermes-structure-dashboard.dto';
import { HermesStructureDashboardInput } from 'src/engine/core-modules/workspace/structure-dashboard/dtos/hermes-structure-dashboard.input';
import { StructureDashboardService } from 'src/engine/core-modules/workspace/structure-dashboard/structure-dashboard.service';
import { AuthProvider } from 'src/engine/decorators/auth/auth-provider.decorator';
import { AllowSuspendedWorkspace } from 'src/engine/decorators/auth/allow-suspended-workspace.decorator';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';

@MetadataResolver()
@AllowSuspendedWorkspace()
@UsePipes(ResolverValidationPipe)
@UseFilters(
  PreventNestToAutoLogGraphqlErrorsFilter,
  AuthGraphqlApiExceptionFilter,
)
@UseGuards(
  AuthPrincipalGuard({
    userSession: {
      standard: true,
      impersonated: false,
      playground: false,
      workspaceAgnostic: true,
    },
    apiKey: false,
    oauthClient: false,
    application: false,
  }),
  NoPermissionGuard,
)
export class StructureDashboardResolver {
  constructor(private readonly dashboardService: StructureDashboardService) {}

  @Query(() => [HermesAuthorizedStructureDTO])
  async hermesAuthorizedStructures(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace({ allowUndefined: true })
    workspace: WorkspaceEntity | undefined,
    @AuthProvider() authProvider: AuthProviderEnum | undefined,
  ) {
    return this.dashboardService.authorizedStructures({
      userId: user.id,
      currentWorkspaceId: workspace?.id,
      authProvider,
    });
  }

  @Query(() => HermesStructureDashboardDTO)
  async hermesStructureDashboard(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace({ allowUndefined: true })
    workspace: WorkspaceEntity | undefined,
    @AuthProvider() authProvider: AuthProviderEnum | undefined,
    @Args('input', { nullable: true }) input?: HermesStructureDashboardInput,
  ) {
    return this.dashboardService.dashboard(
      { userId: user.id, currentWorkspaceId: workspace?.id, authProvider },
      input ?? {},
    );
  }
}
