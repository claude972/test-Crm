import {
  Field,
  Float,
  GraphQLISODateTime,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { WorkspaceUrlsDTO } from 'src/engine/core-modules/workspace/dtos/workspace-urls.dto';

export enum HermesStructureMetricStatus {
  AVAILABLE = 'AVAILABLE',
  FORBIDDEN = 'FORBIDDEN',
  UNAVAILABLE = 'UNAVAILABLE',
  PARTIAL = 'PARTIAL',
}

registerEnumType(HermesStructureMetricStatus, {
  name: 'HermesStructureMetricStatus',
});

export const HERMES_STRUCTURE_METRICS = {
  companies: 'company',
  people: 'person',
  opportunities: 'opportunity',
  tasks: 'task',
} as const;

export type HermesStructureMetricKey = keyof typeof HERMES_STRUCTURE_METRICS;

@ObjectType('HermesAuthorizedStructure')
export class HermesAuthorizedStructureDTO {
  @Field(() => UUIDScalarType)
  workspaceId: string;

  @Field(() => String)
  displayName: string;

  @Field(() => Boolean)
  isCurrent: boolean;

  @Field(() => Boolean)
  requiresAuthentication: boolean;

  @Field(() => WorkspaceUrlsDTO)
  workspaceUrls: WorkspaceUrlsDTO;
}

@ObjectType('HermesStructureMetric')
export class HermesStructureMetricDTO {
  @Field(() => String)
  key: HermesStructureMetricKey;

  @Field(() => Float, { nullable: true })
  value: number | null;

  @Field(() => HermesStructureMetricStatus)
  status: HermesStructureMetricStatus;
}

@ObjectType('HermesStructureMetricTotal')
export class HermesStructureMetricTotalDTO extends HermesStructureMetricDTO {
  @Field(() => Int)
  contributingStructures: number;

  @Field(() => Int)
  totalStructures: number;
}

@ObjectType('HermesStructureDashboardRow')
export class HermesStructureDashboardRowDTO {
  @Field(() => HermesAuthorizedStructureDTO)
  structure: HermesAuthorizedStructureDTO;

  @Field(() => [HermesStructureMetricDTO])
  metrics: HermesStructureMetricDTO[];
}

@ObjectType('HermesStructureDashboard')
export class HermesStructureDashboardDTO {
  @Field(() => GraphQLISODateTime)
  generatedAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  periodStart: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  periodEnd: Date | null;

  @Field(() => Boolean)
  partial: boolean;

  @Field(() => [HermesStructureDashboardRowDTO])
  structures: HermesStructureDashboardRowDTO[];

  @Field(() => [HermesStructureMetricTotalDTO])
  totals: HermesStructureMetricTotalDTO[];
}
