import {
  Field,
  GraphQLISODateTime,
  InputType,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { IsIn, IsInt, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType('HermesMediaScopeInput')
export class HermesMediaScopeInputDTO {
  @Field(() => UUIDScalarType) @IsUUID() conversationId: string;
  @Field(() => UUIDScalarType) @IsUUID() assetId: string;
}
@InputType('HermesPrepareMediaUploadInput')
export class HermesPrepareMediaUploadInputDTO {
  @Field(() => UUIDScalarType) @IsUUID() conversationId: string;
  @Field() @IsIn(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']) kind:
    | 'IMAGE'
    | 'VIDEO'
    | 'AUDIO'
    | 'FILE';
  @Field() @IsString() @MaxLength(160) filename: string;
  @Field() @IsString() @MaxLength(80) mimeType: string;
  @Field(() => Int) @IsInt() @Min(1) size: number;
}
@ObjectType('HermesMediaAsset')
export class HermesMediaAssetDTO {
  @Field(() => UUIDScalarType) id: string;
  @Field() kind: string;
  @Field() filename: string;
  @Field() mimeType: string;
  @Field(() => Int) size: number;
  @Field() status: string;
}
@ObjectType('HermesMediaUploadTarget')
export class HermesMediaUploadTargetDTO {
  @Field(() => UUIDScalarType) assetId: string;
  @Field() uploadUrl: string;
  @Field() contentType: string;
  @Field(() => GraphQLISODateTime) expiresAt: Date;
}
@ObjectType('HermesMediaRead')
export class HermesMediaReadDTO {
  @Field() downloadPath: string;
  @Field(() => GraphQLISODateTime) expiresAt: Date;
}
