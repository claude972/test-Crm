import { UseFilters, UseGuards } from '@nestjs/common';
import { Query } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import { HermesMcpToolSurface } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.dto';
import { HermesMcpToolSurfaceService } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp-tool-surface.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';

// The query takes no argument: the company is the authenticated session's own
// workspace, never a caller-selected one.
@UseGuards(
  AuthPrincipalGuard({
    userSession: {
      standard: true,
      impersonated: false,
      playground: false,
      workspaceAgnostic: false,
    },
    apiKey: false,
    oauthClient: false,
    application: false,
  }),
)
@UseFilters(AuthGraphqlApiExceptionFilter)
@MetadataResolver()
export class HermesMcpToolSurfaceResolver {
  constructor(private readonly surface: HermesMcpToolSurfaceService) {}

  @Query(() => HermesMcpToolSurface)
  hermesMcpToolSurface(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.surface.read({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }
}
