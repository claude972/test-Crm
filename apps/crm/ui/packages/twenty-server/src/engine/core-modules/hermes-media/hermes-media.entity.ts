import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';

@Entity({ name: 'hermesMediaAsset', schema: 'core' })
@Index('IDX_HERMES_MEDIA_FILE', ['fileId'], { unique: true })
@Index('IDX_HERMES_MEDIA_SCOPE', ['workspaceId', 'conversationId'])
export class HermesMediaAssetEntity {
  @PrimaryColumn('uuid') id: string;
  @Column('uuid') workspaceId: string;
  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;
  @Column('uuid') conversationId: string;
  @Column({ type: 'varchar', length: 512 }) providerConnectionId: string;
  @Column('uuid') fileId: string;
  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: Relation<FileEntity>;
  @Column({ type: 'varchar', length: 64, nullable: true }) contentSha256:
    | string
    | null;
  @Column({ type: 'uuid', nullable: true }) ownerUserWorkspaceId: string | null;
  @Column({ type: 'varchar', length: 16 }) kind:
    | 'IMAGE'
    | 'VIDEO'
    | 'AUDIO'
    | 'FILE';
  @Column({ type: 'varchar', length: 160 }) filename: string;
  @Column({ type: 'varchar', length: 80 }) mimeType: string;
  @Column('integer') size: number;
  @Column({ type: 'varchar', length: 16 }) status:
    | 'PENDING'
    | 'READY'
    | 'ATTACHED'
    | 'REVOKED';
  @Column({ type: 'uuid', nullable: true }) messageId: string | null;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
