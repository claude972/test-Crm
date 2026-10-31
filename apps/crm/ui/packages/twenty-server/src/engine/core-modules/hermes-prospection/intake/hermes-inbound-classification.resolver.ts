import { UseFilters, UseGuards } from '@nestjs/common';
import { Args, Query } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import {
  HermesInboundItemClassification,
  HermesInboundReceiptPage,
  HermesScrapingClassification,
} from 'src/engine/core-modules/hermes-prospection/intake/hermes-inbound-classification.dto';
import { HermesInboundClassificationService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-inbound-classification.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';

// The company is always the authenticated session's workspace. No argument
// selects a company, and the signed connection candidates come from that
// workspace's own server-side binding.
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
export class HermesInboundClassificationResolver {
  constructor(
    private readonly classification: HermesInboundClassificationService,
  ) {}

  @Query(() => HermesInboundItemClassification)
  hermesInboundItemClassification(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('provider') provider: string,
    @Args('eventId') eventId: string,
    @Args('bookingUid', { nullable: true }) bookingUid?: string,
  ) {
    return this.classification.classifyBridgeEvent(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      { provider, eventId, bookingUid },
    );
  }

  // No argument selects a company or a connection: the page lists the
  // receipts of the authenticated session's own workspace.
  @Query(() => HermesInboundReceiptPage)
  hermesInboundReceipts(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.classification.listBridgeReceipts({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }

  @Query(() => HermesScrapingClassification)
  hermesScrapingClassification(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.classification.classifyScrapingBatches({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }
}
