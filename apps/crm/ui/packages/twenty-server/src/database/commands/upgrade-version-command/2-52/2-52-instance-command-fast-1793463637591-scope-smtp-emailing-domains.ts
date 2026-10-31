import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.52.0', 1793463637591)
export class ScopeSmtpEmailingDomainsFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TYPE "core"."emailingDomain_driver_enum" AS ENUM(\'LEGACY_GLOBAL\', \'AWS_SES\', \'RESEND\', \'SMTP\', \'LOG\')');
    await queryRunner.query('ALTER TABLE "core"."emailingDomain" ADD "driver" "core"."emailingDomain_driver_enum" NOT NULL DEFAULT \'LEGACY_GLOBAL\'');
    await queryRunner.query('ALTER TABLE "core"."emailingDomain" DROP CONSTRAINT "IDX_EMAILING_DOMAIN_DOMAIN_UNIQUE"');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_EMAILING_DOMAIN_GLOBAL_DOMAIN_UNIQUE" ON "core"."emailingDomain" ("domain") WHERE "driver" <> \'SMTP\'');
    await queryRunner.query('ALTER TABLE "core"."emailingDomain" ADD CONSTRAINT "IDX_EMAILING_DOMAIN_WORKSPACE_DRIVER_UNIQUE" UNIQUE ("workspaceId", "domain", "driver")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."emailingDomain" DROP CONSTRAINT "IDX_EMAILING_DOMAIN_WORKSPACE_DRIVER_UNIQUE"');
    await queryRunner.query('DROP INDEX "core"."IDX_EMAILING_DOMAIN_GLOBAL_DOMAIN_UNIQUE"');
    await queryRunner.query('ALTER TABLE "core"."emailingDomain" ADD CONSTRAINT "IDX_EMAILING_DOMAIN_DOMAIN_UNIQUE" UNIQUE ("domain")');
    await queryRunner.query('ALTER TABLE "core"."emailingDomain" DROP COLUMN "driver"');
    await queryRunner.query('DROP TYPE "core"."emailingDomain_driver_enum"');
  }
}
