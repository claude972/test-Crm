import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { type HermesMessagingActor } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import {
  EvolutionEnrollmentClient,
  EvolutionEnrollmentError,
} from './evolution-enrollment.client';
import {
  enrollmentScopeSchema,
  enrollmentQrSchema,
  provisionerConfiguration,
  type EvolutionEnrollmentView,
  type EvolutionEnrollmentQrView,
} from './evolution-enrollment.policy';

type Snapshot = Awaited<
  ReturnType<HermesConnectionsService['managedEnrollmentSnapshot']>
>;
@Injectable()
export class EvolutionEnrollmentService {
  constructor(
    private readonly connections: HermesConnectionsService,
    private readonly config: KovaaLabCRMConfigService,
  ) {}
  private scope(raw: unknown) {
    const parsed = enrollmentScopeSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException('WA_ENROLLMENT_INPUT_INVALID');
    return parsed.data;
  }
  private operator() {
    try {
      return provisionerConfiguration({
        enabled: this.config.get('HERMES_EVOLUTION_PROVISIONER_ENABLED'),
        baseUrl: this.config.get('HERMES_EVOLUTION_PROVISIONER_BASE_URL'),
        apiKey: this.config.get('HERMES_EVOLUTION_PROVISIONER_API_KEY'),
      });
    } catch {
      throw new ServiceUnavailableException('WA_PROVISIONER_NOT_CONFIGURED');
    }
  }
  private client(
    operator: NonNullable<ReturnType<EvolutionEnrollmentService['operator']>>,
    actor: HermesMessagingActor,
    revision: number,
  ) {
    return new EvolutionEnrollmentClient(operator, async () => {
      await this.connections.managedEnrollmentSnapshot(actor, revision);
    });
  }
  private view(
    snapshot: Snapshot,
    providerState: EvolutionEnrollmentView['providerState'] = null,
    reasonCode: string | null = null,
  ): EvolutionEnrollmentView {
    const managed = snapshot.connection?.managedEvolution;
    let state: EvolutionEnrollmentView['state'] =
      managed?.phase ?? 'NOT_CONFIGURED';
    if (
      managed &&
      !['BLOCKED', 'ACTIVE', 'ACTIVATING'].includes(managed.phase) &&
      providerState
    )
      state =
        providerState === 'open'
          ? 'PAIRED_PENDING_ACTIVATION'
          : providerState === 'connecting'
            ? 'CONNECTING'
            : 'AWAITING_PAIRING';
    if (reasonCode === 'WA_PROVIDER_UNAVAILABLE') state = 'UNAVAILABLE';
    if (managed?.phase === 'ACTIVE' && providerState !== 'open')
      state = 'UNAVAILABLE';
    return {
      state,
      revision: snapshot.revision,
      providerState,
      ingressEnabled:
        managed?.phase === 'ACTIVE' && managed.cutoffSeconds !== undefined,
      cutoffAt:
        managed?.cutoffSeconds === undefined
          ? null
          : new Date(managed.cutoffSeconds * 1000).toISOString(),
      botMode: snapshot.botMode,
      reasonCode,
    };
  }
  private async unconfigured(
    actor: HermesMessagingActor,
    expectedRevision: number,
  ): Promise<EvolutionEnrollmentView> {
    const row = (await this.connections.list(actor)).find(
      (value) => value.kind === 'EVOLUTION',
    );
    if ((row?.revision ?? 0) !== expectedRevision)
      throw new ConflictException('CONNECTION_REVISION_CONFLICT');
    return {
      state: 'NOT_CONFIGURED',
      revision: row?.revision ?? 0,
      providerState: null,
      ingressEnabled: false,
      cutoffAt: null,
      botMode: await this.connections.managedWhatsappBotMode(actor),
      reasonCode: 'WA_PROVISIONER_NOT_CONFIGURED',
    };
  }
  async status(
    actor: HermesMessagingActor,
    raw: unknown,
  ): Promise<EvolutionEnrollmentView> {
    const input = this.scope(raw);
    await this.connections.managedWhatsappBotMode(actor);
    const operator = this.operator();
    if (!operator) return this.unconfigured(actor, input.expectedRevision);
    const snapshot = await this.connections.managedEnrollmentSnapshot(
      actor,
      input.expectedRevision,
    );
    if (
      !snapshot.connection ||
      snapshot.connection.managedEvolution?.phase === 'BLOCKED'
    )
      return this.view(snapshot);
    let providerState: EvolutionEnrollmentView['providerState'] = null,
      reason: string | null = null;
    try {
      providerState = await this.client(
        operator,
        actor,
        snapshot.revision,
      ).status(
        String(snapshot.connection.settings.instanceName),
        snapshot.connection.secrets.apiKey,
      );
    } catch (error) {
      if (!(error instanceof EvolutionEnrollmentError)) throw error;
      reason = error.code;
    }
    return this.view(
      await this.connections.managedEnrollmentSnapshot(
        actor,
        input.expectedRevision,
      ),
      providerState,
      reason,
    );
  }
  async start(
    actor: HermesMessagingActor,
    raw: unknown,
  ): Promise<EvolutionEnrollmentView> {
    const input = this.scope(raw);
    await this.connections.managedWhatsappBotMode(actor);
    const operator = this.operator();
    if (!operator) return this.unconfigured(actor, input.expectedRevision);
    const reserved = await this.connections.reserveManagedEvolution(
      actor,
      input.expectedRevision,
    );
    if (!reserved.created)
      return this.status(actor, { expectedRevision: reserved.revision });
    const snapshot = await this.connections.managedEnrollmentSnapshot(
      actor,
      reserved.revision,
    );
    const connection = snapshot.connection!;
    let phase: 'AWAITING_PAIRING' | 'PROVISIONING_UNCONFIRMED' | 'BLOCKED' =
      'AWAITING_PAIRING';
    let reason: string | null = null;
    try {
      const client = this.client(operator, actor, snapshot.revision);
      await client.create(
        String(connection.settings.instanceName),
        connection.secrets.apiKey,
      );
      await client.webhookDisabled(
        String(connection.settings.instanceName),
        connection.secrets.apiKey,
      );
    } catch (error) {
      if (!(error instanceof EvolutionEnrollmentError)) throw error;
      phase =
        error.code === 'WA_INSTANCE_ALREADY_EXISTS'
          ? 'BLOCKED'
          : 'PROVISIONING_UNCONFIRMED';
      reason = phase === 'BLOCKED' ? error.code : 'WA_PROVISIONING_UNCONFIRMED';
    }
    const revision = await this.connections.transitionManagedEvolution(
      actor,
      reserved.revision,
      phase,
    );
    return this.view(
      await this.connections.managedEnrollmentSnapshot(actor, revision),
      null,
      reason,
    );
  }
  async qr(
    actor: HermesMessagingActor,
    raw: unknown,
  ): Promise<EvolutionEnrollmentQrView> {
    const parsed = enrollmentQrSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException('WA_ENROLLMENT_INPUT_INVALID');
    const input = parsed.data;
    await this.connections.managedWhatsappBotMode(actor);
    const operator = this.operator();
    if (!operator) return this.unconfigured(actor, input.expectedRevision);
    const snapshot = await this.connections.managedEnrollmentSnapshot(
      actor,
      input.expectedRevision,
    );
    const connection = snapshot.connection;
    if (!connection) return this.view(snapshot);
    if (
      ['ACTIVE', 'ACTIVATING', 'BLOCKED'].includes(
        connection.managedEvolution!.phase,
      )
    )
      throw new ConflictException('WA_ENROLLMENT_QR_NOT_ALLOWED');
    const client = this.client(operator, actor, snapshot.revision);
    try {
      const state = await client.status(
        String(connection.settings.instanceName),
        connection.secrets.apiKey,
      );
      if (state === 'open')
        return this.view(
          await this.connections.managedEnrollmentSnapshot(
            actor,
            input.expectedRevision,
          ),
          state,
        );
      await client.webhookDisabled(
        String(connection.settings.instanceName),
        connection.secrets.apiKey,
      );
      const qr = await client.qr(
        String(connection.settings.instanceName),
        connection.secrets.apiKey,
        input.phoneNumber,
      );
      const current = await this.connections.managedEnrollmentSnapshot(
        actor,
        input.expectedRevision,
      );
      return {
        ...this.view(current, 'connecting'),
        ...qr,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
    } catch (error) {
      if (!(error instanceof EvolutionEnrollmentError)) throw error;
      return {
        ...this.view(
          await this.connections.managedEnrollmentSnapshot(
            actor,
            input.expectedRevision,
          ),
          null,
          error.code,
        ),
        state: 'UNAVAILABLE',
      };
    }
  }
  async activate(
    actor: HermesMessagingActor,
    raw: unknown,
  ): Promise<EvolutionEnrollmentView> {
    const input = this.scope(raw);
    await this.connections.managedWhatsappBotMode(actor);
    const operator = this.operator();
    if (!operator) return this.unconfigured(actor, input.expectedRevision);
    let snapshot = await this.connections.managedEnrollmentSnapshot(
      actor,
      input.expectedRevision,
    );
    if (snapshot.botMode !== 'OFF')
      throw new ConflictException('WA_BOT_MUST_BE_OFF');
    const connection = snapshot.connection;
    if (!connection) return this.view(snapshot);
    if (connection.managedEvolution!.phase === 'BLOCKED')
      return this.view(snapshot);
    const client = this.client(operator, actor, snapshot.revision);
    try {
      const state = await client.status(
        String(connection.settings.instanceName),
        connection.secrets.apiKey,
      );
      if (state !== 'open')
        return this.view(
          await this.connections.managedEnrollmentSnapshot(
            actor,
            snapshot.revision,
          ),
          state,
          'WA_NOT_PAIRED',
        );
      if (connection.managedEvolution!.phase === 'ACTIVE')
        return this.view(
          await this.connections.managedEnrollmentSnapshot(
            actor,
            snapshot.revision,
          ),
          state,
        );
      if (connection.managedEvolution!.phase !== 'ACTIVATING')
        await client.webhookDisabled(
          String(connection.settings.instanceName),
          connection.secrets.apiKey,
        );
      const revision = await this.connections.transitionManagedEvolution(
        actor,
        snapshot.revision,
        'ACTIVATING',
      );
      snapshot = await this.connections.managedEnrollmentSnapshot(
        actor,
        revision,
      );
      const origin = new URL(this.config.get('SERVER_URL'));
      if (
        origin.protocol !== 'https:' ||
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash
      )
        throw new EvolutionEnrollmentError('WA_INGRESS_UNCONFIRMED');
      await this.client(operator, actor, revision).activate(
        String(connection.settings.instanceName),
        connection.secrets.apiKey,
        {
          url:
            origin.origin +
            '/webhooks/hermes/evolution/' +
            connection.connectionId,
          secret: connection.secrets.webhookSecret,
        },
      );
      const activeRevision = await this.connections.transitionManagedEvolution(
        actor,
        revision,
        'ACTIVE',
      );
      return this.view(
        await this.connections.managedEnrollmentSnapshot(actor, activeRevision),
        'open',
      );
    } catch (error) {
      if (!(error instanceof EvolutionEnrollmentError)) throw error;
      return {
        ...this.view(
          await this.connections.managedEnrollmentSnapshot(
            actor,
            snapshot.revision,
          ),
          null,
          error.code,
        ),
        state: 'UNAVAILABLE',
      };
    }
  }
}
