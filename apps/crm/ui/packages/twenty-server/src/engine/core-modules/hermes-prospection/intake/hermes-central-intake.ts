import { type EntityManager } from 'typeorm';
import { ConflictException } from '@nestjs/common';

import {
  type HermesConnectionsService,
  type HermesResolvedConnection,
} from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import {
  parseHermesIntakeConnections,
  type HermesIntakeConnection,
} from './hermes-intake.schema';

export const centralIntakeRecord = (
  resolved: HermesResolvedConnection,
): Record<string, HermesIntakeConnection> =>
  parseHermesIntakeConnections(
    JSON.stringify({
      [resolved.connectionId]: {
        ...resolved.settings,
        workspaceId: resolved.workspaceId,
        operatorUserId: resolved.userId,
        operatorUserWorkspaceId: resolved.userWorkspaceId,
        secret: resolved.secrets.secret,
        enabled: true,
      },
    }),
  );

export async function centralIntake(
  reader: HermesConnectionsService,
  connectionId: string,
): Promise<{
  connections: Record<string, HermesIntakeConnection>;
  assertCurrent: (manager?: EntityManager) => Promise<void>;
}> {
  const snapshot = await reader.resolveByConnectionId(connectionId, 'INTAKE');
  const assertCurrent = async (manager?: EntityManager) => {
    const current = await reader.resolveByConnectionId(
      connectionId,
      'INTAKE',
      manager,
    );
    if (
      !snapshot ||
      !current ||
      current.connectionId !== snapshot.connectionId ||
      current.revision !== snapshot.revision
    )
      throw new ConflictException('HERMES_INTAKE_CONNECTION_CHANGED');
  };
  return {
    connections: snapshot ? centralIntakeRecord(snapshot) : {},
    assertCurrent,
    assertRevisionViaQuery: async (query) => {
      if (!snapshot)
        throw new ConflictException('HERMES_INTAKE_CONNECTION_CHANGED');
      await reader.assertRevisionViaQuery(
        snapshot.workspaceId,
        'INTAKE',
        snapshot,
        query,
      );
    },
  };
}
