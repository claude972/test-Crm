import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.52.0', 1793335399769)
export class AddHermesImportStateFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."hermesImportState" ("workspaceId" uuid NOT NULL, "state" jsonb NOT NULL DEFAULT \'{"version":1,"batches":[],"campaignIds":[]}\'::jsonb, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_016a8644a6b442242bc29516445" PRIMARY KEY ("workspaceId"))');
    await queryRunner.query('ALTER TABLE "core"."hermesImportState" ADD CONSTRAINT "FK_016a8644a6b442242bc29516445" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."hermesImportState" DROP CONSTRAINT "FK_016a8644a6b442242bc29516445"');
    await queryRunner.query('DROP TABLE "core"."hermesImportState"');
  }
}
