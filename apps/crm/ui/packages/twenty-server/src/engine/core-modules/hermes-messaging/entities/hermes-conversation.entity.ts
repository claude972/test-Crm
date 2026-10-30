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
import { type HermesBotMode, type HermesMessagingChannel } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

@Entity({ name: 'hermesConversation', schema: 'core' })
@Index('IDX_HERMES_CONVERSATION_TENANT_ID', ['workspaceId', 'id'], {
  unique: true,
})
@Index(
  'IDX_HERMES_CONVERSATION_PROVIDER',
  ['workspaceId', 'channel', 'providerConnectionId', 'providerConversationId'],
  { unique: true },
)
@Index('IDX_HERMES_CONVERSATION_INBOX', ['workspaceId', 'lastMessageAt', 'id'])
export class HermesConversationEntity {
  @PrimaryColumn('uuid') id: string;
  @Column('uuid') workspaceId: string;
  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;
  @Column({ type: 'varchar', length: 16 }) channel: HermesMessagingChannel;
  @Column({ type: 'varchar', length: 512 }) providerConnectionId: string;
  @Column({ type: 'varchar', length: 512 }) providerConversationId: string;
  @Column({ type: 'varchar', length: 512 }) contactHandle: string;
  @Column({ type: 'varchar', length: 512, nullable: true }) subject:
    | string
    | null;
  @Column({ type: 'timestamptz' }) lastMessageAt: Date;
  @Column({type:'varchar',length:16,default:'MANUAL'}) botMode:HermesBotMode;
  @Column({type:'uuid',nullable:true}) botOwnerUserWorkspaceId:string|null;
  @Column({type:'timestamptz',nullable:true}) botModeUpdatedAt:Date|null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
