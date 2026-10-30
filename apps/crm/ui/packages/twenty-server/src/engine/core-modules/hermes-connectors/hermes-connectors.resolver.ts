import { UseFilters, UseGuards } from '@nestjs/common';
import { Query } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import { HermesEvolutionConnectionDTO } from 'src/engine/core-modules/hermes-connectors/dto/hermes-evolution-connection.dto';
import { HermesConnectorsService } from 'src/engine/core-modules/hermes-connectors/hermes-connectors.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';

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
@MetadataResolver(() => HermesEvolutionConnectionDTO)
export class HermesConnectorsResolver {
  constructor(private readonly connectors: HermesConnectorsService) {}

  @Query(() => HermesEvolutionConnectionDTO)
  hermesEvolutionConnection(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<HermesEvolutionConnectionDTO> {
    return this.connectors.evolutionConnection({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }
}
