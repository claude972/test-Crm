import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import {
  type HermesMessagingChannel,
  type HermesMessagingDirection,
  type HermesMessagingStatus,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

@Entity({ name: 'hermesInboxMessage', schema: 'core' })
@Index(
  'IDX_HERMES_MESSAGE_PROVIDER',
  ['workspaceId', 'channel', 'providerConnectionId', 'providerMessageId'],
  { unique: true, where: '"providerMessageId" IS NOT NULL' },
)
@Index(
  'IDX_HERMES_MESSAGE_CLIENT',
  ['workspaceId', 'conversationId', 'clientRequestId'],
  { unique: true, where: '"clientRequestId" IS NOT NULL' },
)
@Index('IDX_HERMES_MESSAGE_INBOX', [
  'workspaceId',
  'conversationId',
  'occurredAt',
  'id',
])
export class HermesInboxMessageEntity {
  @PrimaryColumn('uuid') id: string;
  @Column('uuid') workspaceId: string;
  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;
  @Column('uuid') conversationId: string;
  @ManyToOne(() => HermesConversationEntity, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'workspaceId', referencedColumnName: 'workspaceId' },
    { name: 'conversationId', referencedColumnName: 'id' },
  ])
  conversation: Relation<HermesConversationEntity>;
  @Column({ type: 'varchar', length: 16 }) channel: HermesMessagingChannel;
  @Column({ type: 'varchar', length: 512 }) providerConnectionId: string;
  @Column({ type: 'varchar', length: 512, nullable: true }) providerMessageId:
    | string
    | null;
  @Column({ type: 'uuid', nullable: true }) clientRequestId: string | null;
  @Column({ type: 'varchar', length: 16 }) direction: HermesMessagingDirection;
  @Column({ type: 'varchar', length: 24 }) status: HermesMessagingStatus;
  @Column({ type: 'text' }) text: string;
  @Column({ type: 'varchar', length: 64 }) contentDigest: string;
  @Column({ type: 'timestamptz' }) occurredAt: Date;
  @Column({ type: 'varchar', length: 64, nullable: true }) errorCode:
    | string
    | null;
  // A provider echo and its request resolve to one visible provider message.
  @Column({ type: 'uuid', nullable: true }) canonicalMessageId: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
