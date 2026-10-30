import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { GraphQLJSONObject } from 'graphql-type-json';
import { FeatureFlagKey } from 'kovaa-lab-shared/types';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import { EmailGroupAccessService } from 'src/engine/core-modules/emailing-domain/services/email-group-access.service';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import {
  HermesCreateCampaignDraftInput,
  HermesCreateImportBatchInput,
  HermesQualifyImportRowsInput,
} from 'src/engine/core-modules/hermes-prospection/dto/hermes-prospection.input';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';
import { FeatureFlagGuard } from 'src/engine/guards/feature-flag.guard';

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
@UsePipes(ResolverValidationPipe)
@MetadataResolver()
export class HermesProspectionResolver {
  constructor(
    private readonly prospection: HermesProspectionService,
    private readonly emailAccess: EmailGroupAccessService,
  ) {}

  @Query(() => GraphQLJSONObject)
  hermesImportBatches(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.prospection.list({
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId,
    });
  }

  @Mutation(() => GraphQLJSONObject)
  hermesCreateImportBatch(
    @Args('input') input: HermesCreateImportBatchInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.prospection.createBatch(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }

  @Mutation(() => GraphQLJSONObject)
  hermesQualifyImportRows(
    @Args('input') input: HermesQualifyImportRowsInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    return this.prospection.qualify(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }

  @UseGuards(FeatureFlagGuard(FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED))
  @Mutation(() => GraphQLJSONObject)
  hermesCreateCampaignDraft(
    @Args('input') input: HermesCreateCampaignDraftInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    this.emailAccess.validateEmailGroupAccessOrThrow();

    return this.prospection.createCampaignDraft(
      { workspaceId: workspace.id, userId: user.id, userWorkspaceId },
      input,
    );
  }
}
