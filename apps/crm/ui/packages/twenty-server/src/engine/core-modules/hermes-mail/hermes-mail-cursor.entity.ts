import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Entity({ name: 'hermesMailCursor', schema: 'core' })
export class HermesMailCursorEntity {
  @PrimaryColumn({ type: 'uuid' }) workspaceId: string;
  @PrimaryColumn({ type: 'varchar', length: 100 }) connectionId: string;
  @PrimaryColumn({ type: 'varchar', length: 128 }) mailbox: string;
  @Column({ type: 'varchar', length: 32 }) uidValidity: string;
  @Column({ type: 'bigint', default: '0' }) lastUid: string;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;
}
