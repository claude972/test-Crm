import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDate,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

export const HERMES_DASHBOARD_MAX_STRUCTURES = 100;

@InputType('HermesStructureDashboardInput')
export class HermesStructureDashboardInput {
  @Field(() => [UUIDScalarType], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(HERMES_DASHBOARD_MAX_STRUCTURES)
  @IsUUID('all', { each: true })
  workspaceIds?: string[];

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @IsDate()
  periodStart?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @IsDate()
  periodEnd?: Date;
}
