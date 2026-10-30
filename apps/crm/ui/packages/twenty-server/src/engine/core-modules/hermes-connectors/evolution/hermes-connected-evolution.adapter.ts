import { Injectable } from '@nestjs/common';

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
  constructor(private readonly connections: HermesConnectionsService) {}

  async snapshot(workspaceId: string): Promise<{
    connection: HermesResolvedConnection;
    serialized: string;
    nativeConnection: EvolutionConnection;
    assertCurrent: () => Promise<void>;
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
    const assertCurrent = () => this.assertCurrent(workspaceId, connection);
    return {
      connection,
      serialized,
      nativeConnection,
      assertCurrent,
      adapter: new EvolutionMessagesAdapter(serialized, { assertCurrent }),
    };
  }

  async assertCurrent(workspaceId: string, previous: HermesResolvedConnection) {
    const current = await this.connections.resolve(workspaceId, 'EVOLUTION');
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
