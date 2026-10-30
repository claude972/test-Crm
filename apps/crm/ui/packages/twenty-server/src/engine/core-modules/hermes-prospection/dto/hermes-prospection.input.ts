import { Field, InputType } from '@nestjs/graphql';

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class HermesImportRowInput {
  @Field()
  @IsString()
  @MaxLength(254)
  email: string;

  @Field()
  @IsString()
  @MaxLength(200)
  companyName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  website?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

@InputType()
export class HermesCreateImportBatchInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  externalBatchId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @Field()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    disallow_auth: true,
  })
  @MaxLength(2048)
  sourceUrl: string;

  @Field()
  @IsISO8601()
  collectedAt: string;

  @Field(() => [HermesImportRowInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HermesImportRowInput)
  rows: HermesImportRowInput[];
}

@InputType()
export class HermesQualifyImportRowsInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  batchId: string;

  @Field(() => [UUIDScalarType])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  rowIds: string[];

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(1000)
  professionalPurpose: string;

  @Field()
  @IsUrl({ protocols: ['https'], require_protocol: true, disallow_auth: true })
  @MaxLength(2048)
  privacyNoticeUrl: string;

  @Field()
  @IsIn(['already-informed', 'first-contact-notice'])
  informationMethod: 'already-informed' | 'first-contact-notice';
}

@InputType()
export class HermesCreateCampaignDraftInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @Field(() => [UUIDScalarType])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  rowIds: string[];
}
