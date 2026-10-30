import {
  Field,
  GraphQLISODateTime,
  InputType,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { type HermesMessagingChannel } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

@InputType('HermesInboxPageInput')
class HermesInboxPageInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  cursor?: string;
}
@InputType('HermesInboxConversationsInput')
export class HermesInboxConversationsInputDTO extends HermesInboxPageInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(['WHATSAPP', 'EMAIL'])
  channel?: HermesMessagingChannel;
}
@InputType('HermesInboxMessagesInput')
export class HermesInboxMessagesInputDTO extends HermesInboxPageInput {
  @Field(() => UUIDScalarType) @IsUUID() conversationId: string;
}
@InputType('HermesInboxReplyInput')
export class HermesInboxReplyInputDTO {
  @Field(() => UUIDScalarType) @IsUUID() conversationId: string;
  @Field(() => UUIDScalarType) @IsUUID() clientRequestId: string;
  @Field() @IsString() @MinLength(1) @MaxLength(20000) text: string;
}
@InputType('HermesInboxDraftReplyInput')
export class HermesInboxDraftReplyInputDTO {
  @Field(() => UUIDScalarType) @IsUUID() conversationId: string;
  @Field(() => UUIDScalarType) @IsUUID() messageId: string;
}
@ObjectType('HermesInboxConversation')
export class HermesInboxConversationDTO {
  @Field(() => UUIDScalarType) id: string;
  @Field() channel: string;
  @Field() providerConnectionId: string;
  @Field() contactHandle: string;
  @Field(() => UUIDScalarType, { nullable: true }) personId: string | null;
  @Field() personMatchStatus: string;
  @Field(() => String, { nullable: true }) subject: string | null;
  @Field(() => GraphQLISODateTime) lastMessageAt: Date;
  @Field() botMode: string;
  @Field(() => UUIDScalarType, { nullable: true }) botOwnerUserWorkspaceId:
    | string
    | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  botModeUpdatedAt: Date | null;
}
@ObjectType('HermesInboxMessage')
export class HermesInboxMessageDTO {
  @Field(() => UUIDScalarType) id: string;
  @Field(() => UUIDScalarType) conversationId: string;
  @Field() channel: string;
  @Field() direction: string;
  @Field() text: string;
  @Field() status: string;
  @Field(() => GraphQLISODateTime) occurredAt: Date;
  @Field(() => String, { nullable: true }) errorCode: string | null;
  @Field(() => String, { nullable: true }) providerMessageId: string | null;
}
@ObjectType('HermesInboxConversationsPage')
export class HermesInboxConversationsPageDTO {
  @Field(() => [HermesInboxConversationDTO])
  items: HermesInboxConversationDTO[];
  @Field(() => String, { nullable: true }) nextCursor: string | null;
}
@ObjectType('HermesInboxMessagesPage')
export class HermesInboxMessagesPageDTO {
  @Field(() => [HermesInboxMessageDTO]) items: HermesInboxMessageDTO[];
  @Field(() => String, { nullable: true }) nextCursor: string | null;
}
@ObjectType('HermesMessagingConnection')
export class HermesMessagingConnectionDTO {
  @Field() channel: string;
  @Field() state: string;
  @Field() canSend: boolean;
  @Field() canSync: boolean;
  @Field(() => GraphQLISODateTime) lastCheckedAt: Date;
  @Field(() => String, { nullable: true }) errorCode: string | null;
}
@ObjectType('HermesInboxDraftReply')
export class HermesInboxDraftReplyDTO {
  @Field() mode: string;
  @Field() status: string;
  @Field() provider: string;
  @Field(() => String, { nullable: true }) text?: string;
}

@InputType('HermesInboxSetBotModeInput')
export class HermesInboxSetBotModeInputDTO {
  @Field(() => UUIDScalarType) @IsUUID() conversationId: string;
  @Field() @IsIn(['MANUAL', 'AUTO']) mode: 'MANUAL' | 'AUTO';
}
@ObjectType('HermesInboxBotMode')
export class HermesInboxBotModeDTO {
  @Field(() => UUIDScalarType) conversationId: string;
  @Field() mode: string;
  @Field() status: string;
}
