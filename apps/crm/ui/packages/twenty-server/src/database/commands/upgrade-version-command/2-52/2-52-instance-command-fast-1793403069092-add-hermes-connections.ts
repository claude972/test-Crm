import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.52.0', 1793403069092)
export class AddHermesConnectionsFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."hermesConnection" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workspaceId" uuid NOT NULL, "kind" character varying(16) NOT NULL, "connectionId" uuid NOT NULL, "revision" integer NOT NULL, "enabled" boolean NOT NULL, "configuration" character varying, "identityHash" character varying(64) NOT NULL, "secretHash" character varying(64), "updatedByUserWorkspaceId" uuid NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "CHK_hermesConnection_ciphertext" CHECK ("configuration" IS NULL OR "configuration" LIKE \'enc:v2:%\'), CONSTRAINT "PK_75d98e2568007f81bb3ee3639d5" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_HERMES_CONNECTION_ACTIVE_EVOLUTION" ON "core"."hermesConnection" ("kind", "identityHash") WHERE "enabled" = true AND "kind" = \'EVOLUTION\'');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_HERMES_CONNECTION_ACTIVE_SECRET" ON "core"."hermesConnection" ("kind", "secretHash") WHERE "enabled" = true');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_HERMES_CONNECTION_ID" ON "core"."hermesConnection" ("connectionId") ');
    await queryRunner.query('CREATE UNIQUE INDEX "UQ_hermesConnection_workspace_kind" ON "core"."hermesConnection" ("workspaceId", "kind") ');
    await queryRunner.query('ALTER TABLE "core"."hermesConnection" ADD CONSTRAINT "FK_fabace2997435cbf501df5e0deb" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."hermesConnection" DROP CONSTRAINT "FK_fabace2997435cbf501df5e0deb"');
    await queryRunner.query('DROP INDEX "core"."UQ_hermesConnection_workspace_kind"');
    await queryRunner.query('DROP INDEX "core"."IDX_HERMES_CONNECTION_ID"');
    await queryRunner.query('DROP INDEX "core"."IDX_HERMES_CONNECTION_ACTIVE_SECRET"');
    await queryRunner.query('DROP INDEX "core"."IDX_HERMES_CONNECTION_ACTIVE_EVOLUTION"');
    await queryRunner.query('DROP TABLE "core"."hermesConnection"');
  }
}
