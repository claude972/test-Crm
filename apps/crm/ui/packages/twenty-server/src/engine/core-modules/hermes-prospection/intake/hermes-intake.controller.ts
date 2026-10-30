import {
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  type RawBodyRequest,
  UseGuards,
} from '@nestjs/common';

import { type Request } from 'express';

import { HermesIntakeService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.service';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';

@Controller('webhooks/hermes/intake')
@UseGuards(PublicEndpointGuard, NoPermissionGuard)
export class HermesIntakeController {
  constructor(private readonly intake: HermesIntakeService) {}

  @Post(':connectionId')
  @HttpCode(200)
  receive(
    @Param('connectionId') connectionId: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!request.is('application/json'))
      return this.intake.receive(connectionId, undefined, {
        timestamp: '',
        nonce: '',
        signature: '',
      });
    return this.intake.receive(connectionId, request.rawBody, {
      timestamp: request.get('x-hermes-timestamp') ?? '',
      nonce: request.get('x-hermes-nonce') ?? '',
      signature: request.get('x-hermes-signature') ?? '',
    });
  }
}
