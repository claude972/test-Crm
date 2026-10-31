import { ObjectType } from '@nestjs/graphql';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { EmailingDomainStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-status.type';
import { EmailingDomainTenantStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-tenant-status.type';
import { UnsubscribeHostnameStatus } from 'src/engine/core-modules/emailing-domain/drivers/types/unsubscribe-hostname-status.type';
import { VerificationRecord } from 'src/engine/core-modules/emailing-domain/drivers/types/verifications-record.type';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity.type';

import {
  EMAILING_DOMAIN_PROVENANCE_VALUES,
  LEGACY_GLOBAL_EMAILING_DRIVER,
  type EmailingDomainDriverProvenance,
} from 'src/engine/core-modules/emailing-domain/types/emailing-domain-driver-provenance.type';

@Entity({ name: 'emailingDomain', schema: 'core' })
@ObjectType('EmailingDomain')
@Unique('IDX_EMAILING_DOMAIN_WORKSPACE_DRIVER_UNIQUE', ['workspaceId', 'domain', 'driver'])
@Index('IDX_EMAILING_DOMAIN_GLOBAL_DOMAIN_UNIQUE', ['domain'], {
  unique: true,
  where: `"driver" <> 'SMTP'`,
})
export class EmailingDomainEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: false })
  domain: string;

  @Column({
    type: 'enum',
    enum: EMAILING_DOMAIN_PROVENANCE_VALUES,
    default: LEGACY_GLOBAL_EMAILING_DRIVER,
  })
  driver: EmailingDomainDriverProvenance;

  @Column({
    type: 'enum',
    enum: Object.values(EmailingDomainStatus),
    default: EmailingDomainStatus.PENDING,
    nullable: false,
  })
  status: EmailingDomainStatus;

  @Column({ type: 'jsonb', nullable: true })
  verificationRecords: VerificationRecord[];

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({
    type: 'enum',
    enum: Object.values(EmailingDomainTenantStatus),
    default: EmailingDomainTenantStatus.ACTIVE,
    nullable: false,
  })
  tenantStatus: EmailingDomainTenantStatus;

  @Column({ type: 'varchar', nullable: true })
  unsubscribeHostname: string | null;

  @Column({ type: 'varchar', nullable: true })
  unsubscribeHostnameId: string | null;

  @Column({
    type: 'enum',
    enum: Object.values(UnsubscribeHostnameStatus),
    nullable: true,
  })
  unsubscribeHostnameStatus: UnsubscribeHostnameStatus | null;
}
