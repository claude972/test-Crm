import { timingSafeEqual } from 'node:crypto';

import { type EntityManager } from 'typeorm';
import { Injectable, Optional } from '@nestjs/common';

import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

import {
  HermesConnectionsService,
  type HermesResolvedConnection,
} from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import {
  type HermesMessagingSend,
  type HermesMessagingProbe,
  type HermesMessagingReceipt,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { type EvolutionConnectionProbe } from './evolution-connection-probe.type';
import { EvolutionConnectionAdapter } from './evolution-connection.adapter';
import {
  parseEvolutionConnections,
  type EvolutionConnection,
} from './evolution-connection.schema';
import { EvolutionMessagesAdapter } from './messages/evolution-messages.adapter';
import {
  EvolutionMessageError,
  evolutionProviderConnectionId,
} from './messages/evolution-message.types';

@Injectable()
export class HermesConnectedEvolutionAdapter {
  readonly channel = 'WHATSAPP' as const;
  // The configuration is optional because one existing caller builds this
  // adapter with the central service alone. Without it there is no expected
  // ingress origin, and reception then reports INGRESS_ORIGIN_UNKNOWN rather
  // than accepting whatever host a provider happens to name.
  constructor(
    private readonly connections: HermesConnectionsService,
    @Optional() private readonly config?: KovaaLabCRMConfigService,
  ) {}

  // This deployment's own public origin, from configuration and never from a
  // provider answer. A webhook URL must address one of these to count.
  private ingressOrigins(): string[] {
    try {
      return [this.config?.get('SERVER_URL') ?? null].filter(
        (value): value is string => typeof value === 'string',
      );
    } catch {
      return [];
    }
  }

  // Compares a provider-reported delivery token to this connection's webhook
  // secret, in constant time. Handed to the probe as a comparison so the secret
  // itself never enters the messages adapter or any capability result.
  private ingressTokenMatcher(
    connection: HermesResolvedConnection,
  ): ((value: string) => boolean) | null {
    const secret = connection.secrets.webhookSecret;

    if (typeof secret !== 'string' || secret.length === 0) return null;

    return (value: string) => {
      const reported = Buffer.from(value);
      const expected = Buffer.from(secret);

      return (
        reported.length === expected.length &&
        timingSafeEqual(reported, expected)
      );
    };
  }

  async snapshot(workspaceId: string): Promise<{
    connection: HermesResolvedConnection;
    serialized: string;
    nativeConnection: EvolutionConnection;
    assertCurrent: (manager?: EntityManager) => Promise<void>;
    adapter: EvolutionMessagesAdapter;
  }> {
    const connection = await this.connections.resolve(workspaceId, 'EVOLUTION');
    if (!connection) throw new EvolutionMessageError('NOT_CONFIGURED');
    const serialized = JSON.stringify({
      [workspaceId]: {
        ...connection.settings,
        apiKey: connection.secrets.apiKey,
      },
    });
    const nativeConnection = parseEvolutionConnections(serialized)[workspaceId];
    const assertCurrent = (manager?: EntityManager) =>
      this.assertCurrent(workspaceId, connection, manager);
    return {
      connection,
      serialized,
      nativeConnection,
      assertCurrent,
      // The resolved connection's own identity, which is what our webhook
      // ingress requires in a delivery URL. HermesConnectedEvolutionReceiver
      // refuses an unscoped delivery, so this is the identity a reported
      // webhook URL has to carry for reception to be real.
      adapter: new EvolutionMessagesAdapter(serialized, {
        assertCurrent,
        ingressConnectionId: connection.connectionId,
        ingressOrigins: this.ingressOrigins(),
        matchesIngressToken: this.ingressTokenMatcher(connection),
      }),
    };
  }

  async assertCurrent(
    workspaceId: string,
    previous: HermesResolvedConnection,
    manager?: EntityManager,
  ) {
    const current = await this.connections.resolve(
      workspaceId,
      'EVOLUTION',
      manager,
    );
    if (
      !current ||
      current.connectionId !== previous.connectionId ||
      current.revision !== previous.revision
    )
      throw new EvolutionMessageError('CONNECTION_MISMATCH');
  }

  async probe(workspaceId: string): Promise<HermesMessagingProbe> {
    try {
      const snapshot = await this.snapshot(workspaceId);
      const result = await snapshot.adapter.probe(workspaceId);
      await snapshot.assertCurrent();
      return result;
    } catch (error) {
      return {
        status:
          error instanceof EvolutionMessageError &&
          error.code === 'NOT_CONFIGURED'
            ? 'NOT_CONFIGURED'
            : 'UNAVAILABLE',
        canSend: false,
        canSendMedia: false,
        canReceiveMedia: false,
        canRecordVoice: false,
      };
    }
  }

  async connectionState(
    workspaceId: string,
  ): Promise<EvolutionConnectionProbe> {
    try {
      const snapshot = await this.snapshot(workspaceId);
      const result = await new EvolutionConnectionAdapter(
        snapshot.serialized,
      ).probe(workspaceId);
      await snapshot.assertCurrent();
      return result;
    } catch (error) {
      return {
        workspaceId,
        provider: 'EVOLUTION',
        status:
          error instanceof EvolutionMessageError &&
          error.code === 'NOT_CONFIGURED'
            ? 'NOT_CONFIGURED'
            : 'UNAVAILABLE',
        providerState: null,
        checkedAt: new Date().toISOString(),
        errorCode: null,
      };
    }
  }

  async send(input: HermesMessagingSend): Promise<HermesMessagingReceipt> {
    const snapshot = await this.snapshot(input.workspaceId);
    if (input.providerConnectionId !== snapshot.connection.connectionId)
      throw new EvolutionMessageError('CONNECTION_MISMATCH');
    return snapshot.adapter.send({
      ...input,
      providerConnectionId: evolutionProviderConnectionId(
        snapshot.nativeConnection,
      ),
    });
  }

  async receiveMedia(
    input: Parameters<EvolutionMessagesAdapter['receiveMedia']>[0],
  ): Promise<{ bytes: Buffer; mimeType: string }> {
    const snapshot = await this.snapshot(input.workspaceId);
    if (input.providerConnectionId !== snapshot.connection.connectionId)
      throw new EvolutionMessageError('CONNECTION_MISMATCH');
    const result = await snapshot.adapter.receiveMedia({
      ...input,
      providerConnectionId: evolutionProviderConnectionId(
        snapshot.nativeConnection,
      ),
    });
    await snapshot.assertCurrent();
    return result;
  }
}
