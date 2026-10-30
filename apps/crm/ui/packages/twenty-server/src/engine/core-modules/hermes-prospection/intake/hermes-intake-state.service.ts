import { Injectable } from '@nestjs/common';

import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { type HermesProspectionActor } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import { type HermesIntakeState } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-state.dto';
import { parseHermesIntakeConnections } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.schema';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class HermesIntakeStateService {
  constructor(
    private readonly access: HermesProspectionAccessService,
    private readonly config: KovaaLabCRMConfigService,
    private readonly prospection: HermesProspectionService,
  ) {}

  async read(
    actor: HermesProspectionActor,
    structureName: string | null,
  ): Promise<HermesIntakeState> {
    await this.access.assertAllowed(actor);
    const checkedAt = new Date().toISOString();
    let connections;
    try {
      connections = parseHermesIntakeConnections(
        this.config.get('HERMES_INTAKE_CONNECTIONS'),
      );
    } catch {
      return {
        status: 'CONFIGURATION_ERROR',
        checkedAt,
        errorCode: 'HERMES_INTAKE_CONFIGURATION_UNAVAILABLE',
        endpoints: [],
      };
    }
    const scoped = Object.entries(connections).filter(
      ([, connection]) => connection.workspaceId === actor.workspaceId,
    );
    if (!scoped.length)
      return {
        status: 'NOT_CONFIGURED',
        checkedAt,
        errorCode: null,
        endpoints: [],
      };
    const state = await this.prospection.list(actor);
    return {
      status: 'CONFIGURED_UNVERIFIED',
      checkedAt,
      errorCode: null,
      endpoints: scoped.map(([connectionId, connection]) => {
        const dates = state.batches
          .filter(
            (batch) =>
              batch.origin?.kind === 'SIGNED_INTAKE' &&
              batch.origin.connectionId === connectionId,
          )
          .map((batch) =>
            batch.origin?.kind === 'SIGNED_INTAKE'
              ? batch.origin.receivedAt
              : '',
          )
          .filter((value) => Number.isFinite(Date.parse(value)))
          .sort((a, b) => Date.parse(b) - Date.parse(a));
        return {
          connectionId,
          structureId: actor.workspaceId,
          structureName,
          label: 'Hermes server connection',
          isAccepting: connection.enabled ? null : false,
          lastCollectionAt: dates[0] ?? null,
          providerState: connection.enabled
            ? 'CONFIGURED_UNVERIFIED'
            : 'DISABLED',
          errorCode: null,
          sources: [...new Set(connection.allowedSources)].map((source) => ({
            source,
            relativeEndpoint: `/webhooks/hermes/${source === 'SCRAPING' ? 'intake' : source === 'FORMS' ? 'forms' : 'calendar'}/${connectionId}`,
            humanQualificationRequired: source === 'SCRAPING',
            nativeContactCreationEnabled:
              connection.enabled && source !== 'SCRAPING',
          })),
        };
      }),
    };
  }
}
