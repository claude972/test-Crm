import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Context, Mutation, Query } from '@nestjs/graphql';
import { type Request } from 'express';
import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import {
  CreateWorkspaceOnSameOriginInput,
  SelectWorkspaceOnSameOriginInput,
  SameOriginWorkspaceCapabilities,
} from 'src/engine/core-modules/auth/dto/same-origin-workspace.dto';
import { SignUpDTO } from 'src/engine/core-modules/auth/dto/sign-up.dto';
import { SameOriginWorkspaceService } from 'src/engine/core-modules/auth/services/same-origin-workspace.service';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthProvider } from 'src/engine/decorators/auth/auth-provider.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';

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
  NoPermissionGuard,
)
@UseFilters(
  AuthGraphqlApiExceptionFilter,
  PreventNestToAutoLogGraphqlErrorsFilter,
)
@UsePipes(ResolverValidationPipe)
export class SameOriginWorkspaceResolver {
  constructor(private readonly workspaces: SameOriginWorkspaceService) {}
  @Query(() => SameOriginWorkspaceCapabilities)
  sameOriginWorkspaceCapabilities(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @AuthProvider() provider: AuthProviderEnum,
    @Context() context: { req: Request },
  ) {
    return this.workspaces.capabilities(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      provider,
      context.req,
    );
  }
  @Mutation(() => SignUpDTO)
  createWorkspaceOnSameOrigin(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @AuthProvider() provider: AuthProviderEnum,
    @Args('input') input: CreateWorkspaceOnSameOriginInput,
    @Context() context: { req: Request },
  ) {
    return this.workspaces.create(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      provider,
      input,
      context.req,
    );
  }
  @Mutation(() => SignUpDTO)
  selectWorkspaceOnSameOrigin(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @AuthProvider() provider: AuthProviderEnum,
    @Args('input') input: SelectWorkspaceOnSameOriginInput,
    @Context() context: { req: Request },
  ) {
    return this.workspaces.select(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      provider,
      input,
      context.req,
    );
  }
}
