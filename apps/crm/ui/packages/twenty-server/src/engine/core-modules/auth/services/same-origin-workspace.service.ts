import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Request } from 'express';
import { IsNull, Repository } from 'typeorm';
import { z } from 'zod';
import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { type SignUpDTO } from 'src/engine/core-modules/auth/dto/sign-up.dto';
import {
  SignInUpService,
  type SameOriginWorkspaceActor,
} from 'src/engine/core-modules/auth/services/sign-in-up.service';
import { LoginTokenService } from 'src/engine/core-modules/auth/token/services/login-token.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { workspaceValidator } from 'src/engine/core-modules/workspace/workspace.validate';

const targetSchema = z
  .object({
    expectedWorkspaceId: z.string().uuid(),
    workspaceId: z.string().uuid(),
  })
  .strict();
const createSchema = z
  .object({
    expectedWorkspaceId: z.string().uuid(),
    displayName: z.string().trim().min(1).max(100),
  })
  .strict();
const credentialProviders = [
  AuthProviderEnum.Password,
  AuthProviderEnum.Google,
  AuthProviderEnum.Microsoft,
];

@Injectable()
export class SameOriginWorkspaceService {
  constructor(
    private readonly domains: WorkspaceDomainsService,
    private readonly signInUp: SignInUpService,
    private readonly loginTokens: LoginTokenService,
    @InjectRepository(UserWorkspaceEntity)
    private readonly memberships: Repository<UserWorkspaceEntity>,
  ) {}

  private parse<T>(schema: z.ZodType<T>, raw: unknown): T {
    const input = schema.safeParse(raw);
    if (!input.success)
      throw new AuthException(
        'Invalid workspace selection input',
        AuthExceptionCode.INVALID_INPUT,
      );
    return input.data;
  }

  private async liveActor(
    actor: SameOriginWorkspaceActor,
    expectedWorkspaceId: string,
    request: Request,
  ) {
    this.domains.assertSameOriginWorkspaceRequest(request.headers.origin);
    if (actor.workspaceId !== expectedWorkspaceId)
      throw new AuthException(
        'Workspace context changed',
        AuthExceptionCode.SESSION_SUPERSEDED,
      );
    const sessionHash = await this.loginTokens.getSameOriginSessionBinding(
      request,
      actor.userId,
      actor.workspaceId,
    );
    const membership = await this.memberships.findOne({
      where: {
        id: actor.userWorkspaceId,
        userId: actor.userId,
        workspaceId: actor.workspaceId,
        deletedAt: IsNull(),
        user: { id: actor.userId, disabled: false, deletedAt: IsNull() },
        workspace: { id: actor.workspaceId, deletedAt: IsNull() },
      },
      relations: { user: true, workspace: true },
    });
    if (!membership)
      throw new AuthException(
        'Workspace access is unavailable',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    if (!sessionHash)
      throw new AuthException(
        'A native browser session is required',
        AuthExceptionCode.UNAUTHENTICATED,
      );
    return { membership, sessionHash };
  }

  async capabilities(
    actor: SameOriginWorkspaceActor,
    provider: AuthProviderEnum,
    request: Request,
  ) {
    if (!this.domains.isSameOriginMultiWorkspaceEnabled())
      return { enabled: false, canCreateWorkspace: false };
    const { sessionHash } = await this.liveActor(
      actor,
      actor.workspaceId,
      request,
    );
    if (!credentialProviders.includes(provider))
      return { enabled: true, canCreateWorkspace: false };
    try {
      await this.signInUp.assertSameOriginWorkspaceCreationAllowed({
        ...actor,
        sessionHash,
      });
      return { enabled: true, canCreateWorkspace: true };
    } catch (error) {
      if (!(error instanceof AuthException)) throw error;
      return { enabled: true, canCreateWorkspace: false };
    }
  }

  async create(
    actor: SameOriginWorkspaceActor,
    provider: AuthProviderEnum,
    raw: { expectedWorkspaceId: string; displayName: string },
    request: Request,
  ): Promise<SignUpDTO> {
    const input = this.parse(createSchema, raw);
    const { sessionHash } = await this.liveActor(
      actor,
      input.expectedWorkspaceId,
      request,
    );
    if (!credentialProviders.includes(provider))
      throw new AuthException(
        'Reauthenticate with a workspace-enabled provider',
        AuthExceptionCode.OAUTH_ACCESS_DENIED,
      );
    const { user, workspace } =
      await this.signInUp.signUpOnNewWorkspaceForSameOrigin(
        { ...actor, sessionHash },
        input.displayName,
      );
    await this.liveActor(actor, input.expectedWorkspaceId, request);
    const loginToken = await this.loginTokens.generateLoginTokenForRequest(
      user,
      workspace.id,
      provider,
      request,
      true,
    );
    return {
      loginToken,
      workspace: {
        id: workspace.id,
        workspaceUrls: this.domains.getWorkspaceUrls(workspace),
      },
    };
  }

  async select(
    actor: SameOriginWorkspaceActor,
    provider: AuthProviderEnum,
    raw: { expectedWorkspaceId: string; workspaceId: string },
    request: Request,
  ): Promise<SignUpDTO> {
    const input = this.parse(targetSchema, raw);
    await this.liveActor(actor, input.expectedWorkspaceId, request);
    const membership = await this.memberships.findOne({
      where: {
        userId: actor.userId,
        workspaceId: input.workspaceId,
        deletedAt: IsNull(),
        user: { id: actor.userId, disabled: false, deletedAt: IsNull() },
        workspace: { id: input.workspaceId, deletedAt: IsNull() },
      },
      relations: { user: true, workspace: true },
    });
    if (
      !membership ||
      ![
        WorkspaceActivationStatus.ACTIVE,
        WorkspaceActivationStatus.CREATED,
        WorkspaceActivationStatus.PENDING_CREATION,
        WorkspaceActivationStatus.ONGOING_CREATION,
      ].includes(membership.workspace.activationStatus)
    )
      throw new AuthException(
        'Workspace access is unavailable',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    if (!workspaceValidator.isAuthEnabled(provider, membership.workspace))
      throw new AuthException(
        'Reauthenticate with a workspace-enabled provider',
        AuthExceptionCode.OAUTH_ACCESS_DENIED,
      );
    await this.liveActor(actor, input.expectedWorkspaceId, request);
    const loginToken = await this.loginTokens.generateLoginTokenForRequest(
      membership.user,
      membership.workspaceId,
      provider,
      request,
      true,
    );
    return {
      loginToken,
      workspace: {
        id: membership.workspaceId,
        workspaceUrls: this.domains.getWorkspaceUrls(membership.workspace),
      },
    };
  }
}
