import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Param,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { EvolutionMessageError } from './evolution-message.types';
import { EvolutionWebhookReceiver } from './evolution-webhook.receiver';

export const EVOLUTION_WEBHOOK_RECEIVER = Symbol('EVOLUTION_WEBHOOK_RECEIVER');

@Controller('webhooks/hermes/evolution')
export class EvolutionWebhookController {
  constructor(
    @Inject(EVOLUTION_WEBHOOK_RECEIVER)
    private readonly receiver: {
      receive(
        token: unknown,
        body: unknown,
        connectionId?: string,
      ): ReturnType<EvolutionWebhookReceiver['receive']>;
    },
  ) {}

  @Post()
  @HttpCode(202)
  async receive(
    @Headers('x-hermes-evolution-token') token: unknown,
    @Body() body: unknown,
  ) {
    try {
      return await this.receiver.receive(token, body);
    } catch (error) {
      if (error instanceof EvolutionMessageError) {
        if (error.code === 'WEBHOOK_UNAUTHORIZED')
          throw new UnauthorizedException('Evolution webhook rejected');
        if (error.code === 'WEBHOOK_INVALID_EVENT')
          throw new BadRequestException('Evolution webhook event invalid');
      }
      throw new ServiceUnavailableException(
        'Evolution webhook ingestion unavailable',
      );
    }
  }
  @Post(':connectionId')
  @HttpCode(202)
  async receiveScoped(
    @Param('connectionId') connectionId: string,
    @Headers('x-hermes-evolution-token') token: unknown,
    @Body() body: unknown,
  ) {
    try {
      return await this.receiver.receive(token, body, connectionId);
    } catch (error) {
      if (
        error instanceof EvolutionMessageError &&
        error.code === 'WEBHOOK_UNAUTHORIZED'
      )
        throw new UnauthorizedException('Evolution webhook rejected');
      if (
        error instanceof EvolutionMessageError &&
        error.code === 'WEBHOOK_INVALID_EVENT'
      )
        throw new BadRequestException('Evolution webhook event invalid');
      throw new ServiceUnavailableException(
        'Evolution webhook ingestion unavailable',
      );
    }
  }
}
