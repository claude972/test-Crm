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
        workspaceId: resolved.workspaceId,
        operatorUserId: resolved.userId,
        operatorUserWorkspaceId: resolved.userWorkspaceId,
        secret: resolved.secrets.secret,
        enabled: true,
        ...resolved.settings,
      },
    }),
  );

export async function centralIntake(
  reader: HermesConnectionsService,
  connectionId: string,
): Promise<{
  connections: Record<string, HermesIntakeConnection>;
  assertCurrent: () => Promise<void>;
}> {
  const snapshot = await reader.resolveByConnectionId(connectionId, 'INTAKE');
  const assertCurrent = async () => {
    const current = await reader.resolveByConnectionId(connectionId, 'INTAKE');
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
  };
}
