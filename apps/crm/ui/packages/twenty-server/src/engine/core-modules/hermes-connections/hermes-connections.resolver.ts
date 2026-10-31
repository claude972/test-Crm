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
  HermesConnectionTestService,
  type HermesConnectionTestResult,
  type HermesMailProbe,
} from './hermes-connection-test.service';
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

// Which read-only probe to run against the bound mail account.
//
// The two directions are asked for separately on purpose: a mailbox that
// receives is not a mailbox that can send, and one combined answer would hide
// a broken direction behind a working one.
@InputType()
export class HermesMailConnectionTestInput {
  @Field(() => String)
  @IsIn(['IMAP_LIST_STATUS', 'SMTP_LOGIN_ONLY'])
  probe: HermesMailProbe;
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
  constructor(
    private readonly connections: HermesConnectionsService,
    private readonly tests: HermesConnectionTestService,
  ) {}

  // A connection test the operator asks for.
  //
  // Declared as a Mutation although it changes no stored state: it is a
  // command issued by pressing a button, it must never be served from a cache,
  // and it must never be replayed by a transport retry. A Query would be
  // cached and refetched, which would turn one deliberate diagnostic into
  // repeated provider traffic.
  //
  // It sends no mail: the SMTP path stops after authentication and the IMAP
  // path only lists folders and reads counters. It starts no campaign, no sync
  // and no poll, and it never promotes a configuration to « verified » — the
  // store still publishes only NOT_CONFIGURED and CONFIGURED_UNVERIFIED.
  @Mutation(() => GraphQLJSONObject)
  hermesTestMailConnectionV4(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('input') input: HermesMailConnectionTestInput,
  ): Promise<HermesConnectionTestResult> {
    return this.tests.testMail(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input.probe,
    );
  }

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
