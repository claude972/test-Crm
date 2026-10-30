import {
  Field,
  GraphQLISODateTime,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import {
  type EvolutionProbeErrorCode,
  type EvolutionProbeStatus,
} from 'src/engine/core-modules/hermes-connectors/evolution/evolution-connection-probe.type';

export enum HermesEvolutionProbeStatus {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  PROVIDER_REPORTED_OPEN = 'PROVIDER_REPORTED_OPEN',
  CONNECTING = 'CONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum HermesEvolutionProbeErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INSTANCE_NOT_FOUND = 'INSTANCE_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  REQUEST_FAILED = 'REQUEST_FAILED',
}

registerEnumType(HermesEvolutionProbeStatus, {
  name: 'HermesEvolutionProbeStatus',
});
registerEnumType(HermesEvolutionProbeErrorCode, {
  name: 'HermesEvolutionProbeErrorCode',
});

@ObjectType('HermesEvolutionConnectionProbe')
export class HermesEvolutionConnectionDTO {
  @Field(() => UUIDScalarType)
  workspaceId: string;

  @Field(() => String)
  provider: 'EVOLUTION';

  @Field(() => HermesEvolutionProbeStatus)
  status: EvolutionProbeStatus;

  @Field(() => String, { nullable: true })
  providerState: 'open' | 'close' | 'connecting' | null;

  @Field(() => GraphQLISODateTime)
  checkedAt: Date;

  @Field(() => HermesEvolutionProbeErrorCode, { nullable: true })
  errorCode: EvolutionProbeErrorCode | null;
}
