import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { type HermesProspectionState } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';

@Entity({ name: 'hermesImportState', schema: 'core' })
export class HermesImportStateEntity {
  @PrimaryColumn('uuid')
  workspaceId: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;

  @Column({
    type: 'jsonb',
    default: () => '\'{"version":1,"batches":[],"campaignIds":[]}\'::jsonb',
  })
  state: HermesProspectionState;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
