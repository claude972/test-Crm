import {
  Check,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';

import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

export type HermesConnectionKind = 'EVOLUTION' | 'MAIL' | 'MCP' | 'INTAKE';

@Index('UQ_hermesConnection_workspace_kind', ['workspaceId', 'kind'], {
  unique: true,
})
@Entity({ name: 'hermesConnection', schema: 'core' })
@Check(
  'CHK_hermesConnection_ciphertext',
  `"configuration" IS NULL OR "configuration" LIKE 'enc:v2:%'`,
)
export class HermesConnectionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') workspaceId: string;
  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<WorkspaceEntity>;
  @Column({ type: 'varchar', length: 16 }) kind: HermesConnectionKind;
  @Column('uuid') connectionId: string;
  @Column({ type: 'integer' }) revision: number;
  @Column({ type: 'boolean' }) enabled: boolean;
  @Column({ type: 'varchar', nullable: true })
  configuration: EncryptedString | null;
  @Column({ type: 'varchar', length: 64 }) identityHash: string;
  @Column('uuid') updatedByUserWorkspaceId: string;
  @Column({ type: 'timestamptz' }) updatedAt: Date;
}
