import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
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
    let connections;
    try {
      connections = parseHermesIntakeConnections(
        this.config.get('HERMES_INTAKE_CONNECTIONS'),
      );
    } catch {
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
    const result = await this.prospection.createBatch(
      {
        workspaceId: connection.workspaceId,
        userId: connection.operatorUserId,
        userWorkspaceId: connection.operatorUserWorkspaceId,
      },
      input,
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
