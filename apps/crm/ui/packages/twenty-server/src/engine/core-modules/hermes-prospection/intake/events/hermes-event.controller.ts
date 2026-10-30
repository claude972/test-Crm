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

import { HermesEventService } from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-event.service';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';

@Controller('webhooks/hermes')
@UseGuards(PublicEndpointGuard, NoPermissionGuard)
export class HermesEventController {
  constructor(private readonly events: HermesEventService) {}

  @Post('forms/:connectionId')
  @HttpCode(200)
  forms(
    @Param('connectionId') id: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.receive('forms', id, request);
  }

  @Post('calendar/:connectionId')
  @HttpCode(200)
  calendar(
    @Param('connectionId') id: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.receive('calendar', id, request);
  }

  private receive(
    kind: 'forms' | 'calendar',
    id: string,
    request: RawBodyRequest<Request>,
  ) {
    return this.events.receive(
      kind,
      id,
      request.is('application/json') ? request.rawBody : undefined,
      {
        timestamp: request.get('x-hermes-timestamp') ?? '',
        nonce: request.get('x-hermes-nonce') ?? '',
        signature: request.get('x-hermes-signature') ?? '',
      },
    );
  }
}
