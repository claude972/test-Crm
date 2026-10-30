import { Field, InputType, Int, OmitType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class HermesMailFolderInput {
  @Field() @IsString() @MaxLength(128) folder: string;
}
@InputType()
export class HermesMailPageInput extends HermesMailFolderInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  cursor?: string;
}
@InputType()
export class HermesMailMessageInput extends HermesMailFolderInput {
  @Field() @IsString() @Matches(/^[0-9]{1,10}$/) uid: string;
  @Field() @IsString() @Matches(/^[0-9]{1,32}$/) uidValidity: string;
}
@InputType()
export class HermesMailUpdateInput extends HermesMailMessageInput {
  @Field({ nullable: true }) @IsOptional() @IsBoolean() seen?: boolean;
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  destination?: string;
}
@InputType()
export class HermesMailComposeInput extends HermesMailMessageInput {
  @Field() @IsIn(['REPLY', 'REPLY_ALL', 'FORWARD']) mode: string;
  @Field() @IsString() @MaxLength(320) from: string;
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(320, { each: true })
  to?: string[];
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(320, { each: true })
  cc?: string[];
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(320, { each: true })
  bcc?: string[];
  @Field() @IsString() @MaxLength(10000) text: string;
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1048576)
  html?: string;
  @Field(() => UUIDScalarType, { nullable: true })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
  @Field(() => UUIDScalarType, { nullable: true })
  @IsOptional()
  @IsUUID()
  clientRequestId?: string;
  @Field(() => [UUIDScalarType], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID(undefined, { each: true })
  attachmentIds?: string[];
}

@InputType()
export class HermesMailNewDraftInput extends OmitType(HermesMailComposeInput, [
  'folder',
  'uid',
  'uidValidity',
  'mode',
] as const) {
  @Field() @IsString() @MaxLength(512) subject: string;
  @Field(() => UUIDScalarType, { nullable: true })
  @IsOptional()
  @IsUUID()
  draftId?: string;
  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/)
  draftRevision?: string;
}

@InputType()
export class HermesMailCloneAttachmentInput {
  @Field(() => UUIDScalarType) @IsUUID() sourceConversationId: string;
  @Field(() => UUIDScalarType) @IsUUID() sourceAssetId: string;
  @Field(() => UUIDScalarType) @IsUUID() targetConversationId: string;
}

export type HermesMailAddress = { address: string | null; name: string | null };
export type HermesMailPage = {
  state: 'AVAILABLE';
  folder: string;
  uidValidity: string;
  messages: {
    uid: string;
    subject: string;
    from: HermesMailAddress[];
    to: HermesMailAddress[];
    cc: HermesMailAddress[];
    occurredAt: string | null;
    seen: boolean | null;
    size: number | null;
  }[];
  nextCursor: string | null;
};
