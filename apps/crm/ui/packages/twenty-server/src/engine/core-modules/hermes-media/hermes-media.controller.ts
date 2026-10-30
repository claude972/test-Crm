import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { type Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { type FlatAuthContextUser } from 'src/engine/core-modules/auth/types/flat-auth-context-user.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { HermesMediaService } from './hermes-media.service';

@Controller('hermes-media')
@UseGuards(
  JwtAuthGuard,
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
  CustomPermissionGuard,
)
export class HermesMediaController {
  constructor(private readonly media: HermesMediaService) {}
  @Get(':id')
  async read(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: FlatAuthContextUser,
    @AuthUserWorkspaceId() membership: string,
    @Param('id') assetId: string,
    @Query('conversationId') conversationId: string,
    @Query('token') token: string,
    @Res() response: Response,
  ) {
    const { stream, asset } = await this.media.open(
      {
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId: membership,
      },
      { conversationId, assetId },
      token,
    );
    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', String(asset.size));
    response.setHeader(
      'Content-Disposition',
      `${asset.kind === 'FILE' ? 'attachment' : 'inline'}; filename="media"; filename*=UTF-8''${encodeURIComponent(asset.filename)}`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; sandbox",
    );
    try {
      await pipeline(stream, response);
    } catch {
      response.destroy();
    } finally {
      stream.destroy();
    }
  }
}
