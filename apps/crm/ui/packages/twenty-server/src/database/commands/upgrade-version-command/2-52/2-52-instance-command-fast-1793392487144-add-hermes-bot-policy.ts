import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.52.0', 1793392487144)
export class AddHermesBotPolicyFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "core"."hermesBotPolicy" ("workspaceId" uuid NOT NULL, "scope" character varying(16) NOT NULL, "mode" character varying(16) NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedByUserWorkspaceId" uuid NOT NULL, CONSTRAINT "PK_0639fa85a0bf254d4977c16d312" PRIMARY KEY ("workspaceId", "scope"))',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."hermesBotPolicy" ADD CONSTRAINT "FK_875d44ea71e148e35de001e3fb3" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "core"."hermesBotPolicy" DROP CONSTRAINT "FK_875d44ea71e148e35de001e3fb3"',
    );
    await queryRunner.query('DROP TABLE "core"."hermesBotPolicy"');
  }
}
