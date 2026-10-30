import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';
import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';
import { HermesMediaService } from './hermes-media.service';
import {
  HermesMediaScopeInputDTO,
  HermesPrepareMediaUploadInputDTO,
  HermesMediaAssetDTO,
  HermesMediaUploadTargetDTO,
  HermesMediaReadDTO,
} from './hermes-media.dto';
@MetadataResolver()
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
@UseFilters(
  AuthGraphqlApiExceptionFilter,
  PreventNestToAutoLogGraphqlErrorsFilter,
)
@UsePipes(ResolverValidationPipe)
export class HermesMediaResolver {
  constructor(private readonly media: HermesMediaService) {}
  @Mutation(() => HermesMediaUploadTargetDTO)
  hermesPrepareMediaUpload(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesPrepareMediaUploadInputDTO,
  ) {
    return this.media.prepare(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Mutation(() => HermesMediaAssetDTO)
  hermesFinalizeMediaUpload(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesMediaScopeInputDTO,
  ) {
    return this.media.finalize(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Mutation(() => Boolean)
  hermesCancelMediaUpload(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesMediaScopeInputDTO,
  ) {
    return this.media.cancel(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Query(() => HermesMediaReadDTO)
  hermesMediaRead(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesMediaScopeInputDTO,
  ) {
    return this.media.read(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
}
