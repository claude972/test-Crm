import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';
import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import {
  HermesInboxConversationsInputDTO,
  HermesInboxMessagesInputDTO,
  HermesInboxReplyInputDTO,
  HermesInboxDraftReplyInputDTO,
  HermesInboxConversationsPageDTO,
  HermesInboxMessagesPageDTO,
  HermesInboxMessageDTO,
  HermesInboxDraftReplyDTO,
  HermesMessagingConnectionDTO,
  HermesInboxSetBotModeInputDTO,
  HermesInboxBotModeDTO,
  HermesConversationBotPolicyInputDTO,
  HermesConversationBotPolicyDTO,
  HermesSetConversationBotPolicyInputDTO,
  HermesWorkspaceBotPolicyDTO,
  HermesSetWorkspaceBotPolicyInputDTO,
} from 'src/engine/core-modules/hermes-messaging/dtos/hermes-inbox.dto';
import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';

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
export class HermesMessagingResolver {
  constructor(private readonly messaging: HermesMessagingService) {}
  @Query(() => [HermesMessagingConnectionDTO])
  hermesMessagingConnections(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
  ) {
    return this.messaging.connections({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId: membership,
    });
  }
  @Query(() => HermesInboxConversationsPageDTO)
  hermesInboxConversations(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input', { nullable: true }) input?: HermesInboxConversationsInputDTO,
  ) {
    return this.messaging.conversations(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Query(() => HermesInboxMessagesPageDTO)
  hermesInboxMessages(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesInboxMessagesInputDTO,
  ) {
    return this.messaging.messages(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Mutation(() => HermesInboxMessageDTO)
  hermesInboxReply(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesInboxReplyInputDTO,
  ) {
    return this.messaging.reply(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Mutation(() => HermesInboxDraftReplyDTO)
  hermesInboxDraftReply(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesInboxDraftReplyInputDTO,
  ) {
    return this.messaging.draftReply(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Mutation(() => HermesInboxBotModeDTO)
  hermesInboxSetBotMode(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesInboxSetBotModeInputDTO,
  ) {
    return this.messaging.setBotMode(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Query(() => HermesConversationBotPolicyDTO)
  hermesConversationBotPolicy(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesConversationBotPolicyInputDTO,
  ) {
    return this.messaging.conversationBotPolicy(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Mutation(() => HermesConversationBotPolicyDTO)
  hermesSetConversationBotPolicy(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesSetConversationBotPolicyInputDTO,
  ) {
    return this.messaging.setConversationBotPolicy(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
  @Query(() => [HermesWorkspaceBotPolicyDTO])
  hermesWorkspaceBotPolicies(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
  ) {
    return this.messaging.workspaceBotPolicies({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId: membership,
    });
  }
  @Mutation(() => HermesWorkspaceBotPolicyDTO)
  hermesSetWorkspaceBotPolicy(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Args('input') input: HermesSetWorkspaceBotPolicyInputDTO,
  ) {
    return this.messaging.setWorkspaceBotPolicy(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      input,
    );
  }
}
