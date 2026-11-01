import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
  InputType,
  Int,
  Mutation,
} from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { type Response } from 'express';
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
import { EvolutionEnrollmentService } from './evolution-enrollment.service';

@InputType()
export class HermesWhatsappEnrollmentScopeInput {
  @Field(() => Int) @IsInt() @Min(0) @Max(2147483646) expectedRevision: number;
}
@InputType()
export class HermesWhatsappEnrollmentQrInput extends HermesWhatsappEnrollmentScopeInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phoneNumber?: string;
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
export class EvolutionEnrollmentResolver {
  constructor(private readonly enrollment: EvolutionEnrollmentService) {}
  private actor(
    workspace: WorkspaceEntity,
    user: FlatAuthContextUser,
    member: string,
  ) {
    return {
      workspaceId: workspace.id,
      userId: user.id,
      userWorkspaceId: member,
    };
  }
  private noStore(response?: Response) {
    response?.setHeader('Cache-Control', 'private, no-store');
  }
  @Mutation(() => GraphQLJSONObject)
  hermesWhatsappEnrollmentStart(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() member: string,
    @Args('input') input: HermesWhatsappEnrollmentScopeInput,
    @Context('res') response?: Response,
  ) {
    this.noStore(response);
    return this.enrollment.start(this.actor(workspace, user, member), input);
  }
  @Mutation(() => GraphQLJSONObject)
  hermesWhatsappEnrollmentQr(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() member: string,
    @Args('input') input: HermesWhatsappEnrollmentQrInput,
    @Context('res') response?: Response,
  ) {
    this.noStore(response);
    return this.enrollment.qr(this.actor(workspace, user, member), input);
  }
  @Mutation(() => GraphQLJSONObject)
  hermesWhatsappEnrollmentStatus(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() member: string,
    @Args('input') input: HermesWhatsappEnrollmentScopeInput,
    @Context('res') response?: Response,
  ) {
    this.noStore(response);
    return this.enrollment.status(this.actor(workspace, user, member), input);
  }
  @Mutation(() => GraphQLJSONObject)
  hermesWhatsappEnrollmentActivate(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() member: string,
    @Args('input') input: HermesWhatsappEnrollmentScopeInput,
    @Context('res') response?: Response,
  ) {
    this.noStore(response);
    return this.enrollment.activate(this.actor(workspace, user, member), input);
  }
}
