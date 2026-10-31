import { type EntityManager } from 'typeorm';
import { HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { centralIntake } from 'src/engine/core-modules/hermes-prospection/intake/hermes-central-intake';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { HermesCreateImportBatchInput } from 'src/engine/core-modules/hermes-prospection/dto/hermes-prospection.input';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { HermesIntakeReplayService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-replay.service';
import {
  hermesIntakeBodySchema,
  parseHermesIntakeConnections,
  type HermesIntakeConnection,
} from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.schema';
import {
  HERMES_INTAKE_MAX_BODY_BYTES,
  verifyHermesIntakeSignature,
} from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-signature';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

export type HermesIntakeHeaders = {
  timestamp: string;
  nonce: string;
  signature: string;
};

@Injectable()
export class HermesIntakeService {
  constructor(
    private readonly config: KovaaLabCRMConfigService,
    private readonly replay: HermesIntakeReplayService,
    private readonly prospection: HermesProspectionService,
    @Optional() private readonly central?: HermesConnectionsService,
  ) {}

  async receive(
    connectionId: string,
    body: Buffer | undefined,
    headers: HermesIntakeHeaders,
  ) {
    if (!body) throw new BadRequestException('HERMES_INTAKE_RAW_BODY_REQUIRED');
    if (body.length > HERMES_INTAKE_MAX_BODY_BYTES)
      throw new HttpException(
        'HERMES_INTAKE_BODY_TOO_LARGE',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    let connections: Record<string, HermesIntakeConnection>;
    let assertCurrent: (manager?:EntityManager) => Promise<void> = async () => undefined;
    try {
      if (this.central) {
        const snapshot = await centralIntake(this.central, connectionId);
        connections = snapshot.connections;
        assertCurrent = snapshot.assertCurrent;
      } else {
        connections = parseHermesIntakeConnections(
          this.config.get('HERMES_INTAKE_CONNECTIONS'),
        );
      }
    } catch (error) {
      // Same boundary as the event endpoint: resolve() re-authorizes the
      // stored owner inside this block, so an owner revocation is raised here
      // and is a refusal, not a configuration failure. Note this is distinct
      // from a removed or disabled binding, which resolves to null and is
      // answered by the authentication check below.
      if (error instanceof ForbiddenException) throw error;
      throw new ServiceUnavailableException(
        'HERMES_INTAKE_CONFIGURATION_UNAVAILABLE',
      );
    }
    const connection = Object.prototype.hasOwnProperty.call(
      connections,
      connectionId,
    )
      ? connections[connectionId]
      : undefined;
    if (
      !connection?.enabled ||
      !connection.allowedSources.includes('SCRAPING') ||
      !verifyHermesIntakeSignature({
        connectionId,
        body,
        ...headers,
        secret: connection.secret,
        now: Date.now(),
      })
    ) {
      throw new UnauthorizedException('HERMES_INTAKE_AUTHENTICATION_FAILED');
    }
    let payload;
    try {
      const text = body.toString('utf8');
      if (!Buffer.from(text, 'utf8').equals(body)) throw new Error();
      payload = hermesIntakeBodySchema.parse(JSON.parse(text));
    } catch {
      throw new BadRequestException('HERMES_INTAKE_PAYLOAD_INVALID');
    }
    const input = plainToInstance(HermesCreateImportBatchInput, {
      ...payload,
      externalBatchId: `${connectionId}:${payload.externalBatchId}`,
    });
    if ((await validate(input, { forbidUnknownValues: true })).length)
      throw new BadRequestException('HERMES_INTAKE_PAYLOAD_INVALID');
    const claimed = await this.replay.claim(
      connectionId,
      headers.nonce,
      connection.maxRequestsPerMinute,
    );
    if (claimed === 'replayed')
      throw new ConflictException('HERMES_INTAKE_SIGNED_REQUEST_REPLAYED');
    if (claimed === 'rate-limited')
      throw new HttpException(
        'HERMES_INTAKE_RATE_LIMITED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    await assertCurrent();
    const result = await this.prospection.createBatch(
      {
        workspaceId: connection.workspaceId,
        userId: connection.operatorUserId,
        userWorkspaceId: connection.operatorUserWorkspaceId,
      },
      input,
      { connectionId,...(this.central?{assertLive:assertCurrent}:{}) },
    );
    return {
      batchId: result.batch.id,
      externalBatchId: result.batch.externalBatchId,
      replay: result.replay,
      rowCount: result.batch.rows.length,
      intakeConnectionId: connectionId,
      qualificationRequired: true,
    };
  }
}
