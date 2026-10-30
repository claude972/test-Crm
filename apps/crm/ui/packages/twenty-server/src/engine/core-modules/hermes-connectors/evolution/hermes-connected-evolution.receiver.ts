import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesMediaService } from 'src/engine/core-modules/hermes-media/hermes-media.service';
import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import { HermesConnectedEvolutionAdapter } from './hermes-connected-evolution.adapter';
import { EvolutionMessageError } from './messages/evolution-message.types';
import {
  EvolutionWebhookReceiver,
  type EvolutionWebhookResult,
} from './messages/evolution-webhook.receiver';

@Injectable()
export class HermesConnectedEvolutionReceiver {
  constructor(
    private readonly connections: HermesConnectionsService,
    private readonly evolution: HermesConnectedEvolutionAdapter,
    private readonly media: HermesMediaService,
    private readonly inbox: HermesMessagingService,
  ) {}
  async receive(token: unknown, body: unknown, connectionId?: string) {
    if (
      !connectionId ||
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(token)
    )
      throw new EvolutionMessageError('WEBHOOK_UNAUTHORIZED');
    const connection = await this.connections.resolveByConnectionId(
      connectionId,
      'EVOLUTION',
    );
    const secret = connection?.secrets.webhookSecret;
    if (
      !connection ||
      !secret ||
      secret.length !== token.length ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(token))
    )
      throw new EvolutionMessageError('WEBHOOK_UNAUTHORIZED');
    // The authenticated connection lookup supplies workspace; the event body cannot choose it.
    const snapshot = await this.evolution.snapshot(connection.workspaceId);
    if (
      snapshot.connection.connectionId !== connectionId ||
      snapshot.connection.revision !== connection.revision
    )
      throw new EvolutionMessageError('CONNECTION_MISMATCH');
    const receiver = new EvolutionWebhookReceiver(
      snapshot.serialized,
      JSON.stringify({ [connection.workspaceId]: secret }),
      async (event) => {
        await snapshot.assertCurrent();
        return this.inbox.ingest(event, { assertLive: snapshot.assertCurrent });
      },
      async (input) => {
        const bytes = await this.evolution.receiveMedia(input);
        await snapshot.assertCurrent();
        return this.media.receive(
          { ...input, ...bytes },
          { assertLive: snapshot.assertCurrent },
        );
      },
      { connectionId, assertCurrent: snapshot.assertCurrent },
    );
    return receiver.receive(token, body);
  }
}
