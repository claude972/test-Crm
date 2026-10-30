import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Field, InputType, Int, Mutation, Query } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { IsIn, IsInt, IsObject, IsOptional, Min } from 'class-validator';

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

import { type HermesConnectionKind } from './hermes-connection.entity';
import {
  HermesConnectionsService,
  type HermesConnectionView,
} from './hermes-connections.service';

@InputType()
export class HermesConnectionScopeInput {
  @Field(() => String)
  @IsIn(['EVOLUTION', 'MAIL', 'MCP', 'INTAKE'])
  kind: HermesConnectionKind;
  @Field(() => Int) @IsInt() @Min(0) expectedRevision: number;
}

@InputType()
export class HermesConnectionSaveInput extends HermesConnectionScopeInput {
  @Field(() => GraphQLJSONObject) @IsObject() settings: Record<string, unknown>;
  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  @IsObject()
  secrets?: Record<string, string>;
}

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
export class HermesConnectionsResolver {
  constructor(private readonly connections: HermesConnectionsService) {}

  @Query(() => [GraphQLJSONObject])
  hermesConnectionsV4(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<HermesConnectionView[]> {
    return this.connections.list({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => GraphQLJSONObject)
  hermesSaveConnectionV4(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('input') input: HermesConnectionSaveInput,
  ): Promise<HermesConnectionView> {
    return this.connections.save(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }

  @Mutation(() => GraphQLJSONObject)
  hermesRemoveConnectionV4(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('input') input: HermesConnectionScopeInput,
  ): Promise<HermesConnectionView> {
    return this.connections.remove(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
}
