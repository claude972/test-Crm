import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  type HermesBotPolicyMode,
  type HermesBotPolicyScope,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

@Entity({ name: 'hermesBotPolicy', schema: 'core' })
export class HermesBotPolicyEntity {
  @PrimaryColumn('uuid') workspaceId: string;
  @PrimaryColumn({ type: 'varchar', length: 16 }) scope: HermesBotPolicyScope;
  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;
  @Column({ type: 'varchar', length: 16 }) mode: HermesBotPolicyMode;
  @Column({ type: 'timestamptz' }) updatedAt: Date;
  @Column('uuid') updatedByUserWorkspaceId: string;
}
