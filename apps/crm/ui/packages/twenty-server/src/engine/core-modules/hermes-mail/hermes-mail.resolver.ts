import { UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import { HermesMailboxService } from 'src/engine/core-modules/hermes-mail/hermes-mailbox.service';
import {
  HermesMailComposeInput,
  HermesMailCloneAttachmentInput,
  HermesMailMessageInput,
  HermesMailNewDraftInput,
  HermesMailPageInput,
  type HermesMailPage,
  HermesMailUpdateInput,
} from 'src/engine/core-modules/hermes-mail/hermes-mail-v4.dto';
import { HermesMailService } from 'src/engine/core-modules/hermes-mail/hermes-mail.service';
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
@MetadataResolver()
export class HermesMailResolver {
  constructor(
    private readonly mail: HermesMailService,
    private readonly mailbox: HermesMailboxService,
  ) {}

  @Mutation(() => GraphQLJSONObject)
  hermesInboxSyncEmail(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mail.sync({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }
  @Query(() => GraphQLJSONObject)
  hermesMailFoldersV4(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mailbox.folders({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }
  @Query(() => GraphQLJSONObject)
  hermesMailMessagesV4(
    @Args('input') input: HermesMailPageInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<HermesMailPage> {
    return this.mailbox.page(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
  @Query(() => GraphQLJSONObject)
  hermesMailMessageV4(
    @Args('input') input: HermesMailMessageInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mailbox.message(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
  @Mutation(() => GraphQLJSONObject)
  hermesMailUpdateV4(
    @Args('input') input: HermesMailUpdateInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mailbox.update(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
  @Mutation(() => GraphQLJSONObject)
  hermesMailPlanV4(
    @Args('input') input: HermesMailComposeInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mailbox.compose(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
      false,
    );
  }
  @Mutation(() => GraphQLJSONObject)
  hermesMailSaveDraftV4(
    @Args('input') input: HermesMailComposeInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mailbox.compose(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
      true,
    );
  }
  @Mutation(() => GraphQLJSONObject)
  hermesMailSendV4(
    @Args('input') input: HermesMailComposeInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mailbox.send(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
  @Mutation(() => GraphQLJSONObject)
  hermesMailCreateDraftV4(
    @Args('input') input: HermesMailNewDraftInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mailbox.createDraft(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
  @Mutation(() => GraphQLJSONObject)
  hermesMailSendNewV4(
    @Args('input') input: HermesMailNewDraftInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mailbox.sendNew(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
  @Mutation(() => GraphQLJSONObject)
  hermesMailCloneAttachmentV4(
    @Args('input') input: HermesMailCloneAttachmentInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.mail.cloneAttachment(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
}
