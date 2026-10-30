import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.52.0', 1793402072719)
export class AddHermesMediaFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."hermesMediaAsset" ("id" uuid NOT NULL, "workspaceId" uuid NOT NULL, "conversationId" uuid NOT NULL, "providerConnectionId" character varying(512) NOT NULL, "fileId" uuid NOT NULL, "contentSha256" character varying(64), "ownerUserWorkspaceId" uuid, "kind" character varying(16) NOT NULL, "filename" character varying(160) NOT NULL, "mimeType" character varying(80) NOT NULL, "size" integer NOT NULL, "status" character varying(16) NOT NULL, "messageId" uuid, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f2d3efb81710cd700baec6bca71" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE INDEX "IDX_HERMES_MEDIA_SCOPE" ON "core"."hermesMediaAsset" ("workspaceId", "conversationId") ');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_HERMES_MEDIA_FILE" ON "core"."hermesMediaAsset" ("fileId") ');
    await queryRunner.query('ALTER TABLE "core"."hermesInboxMessage" ADD "kind" character varying(16) NOT NULL DEFAULT \'TEXT\'');
    await queryRunner.query('ALTER TABLE "core"."hermesInboxMessage" ADD "attachmentIds" uuid array NOT NULL DEFAULT \'{}\'');
    await queryRunner.query('ALTER TABLE "core"."hermesMediaAsset" ADD CONSTRAINT "FK_ab139c7421d8661e60953276312" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "core"."hermesMediaAsset" ADD CONSTRAINT "FK_0d630f8f6333331312acf79de53" FOREIGN KEY ("fileId") REFERENCES "core"."file"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."hermesMediaAsset" DROP CONSTRAINT "FK_0d630f8f6333331312acf79de53"');
    await queryRunner.query('ALTER TABLE "core"."hermesMediaAsset" DROP CONSTRAINT "FK_ab139c7421d8661e60953276312"');
    await queryRunner.query('ALTER TABLE "core"."hermesInboxMessage" DROP COLUMN "attachmentIds"');
    await queryRunner.query('ALTER TABLE "core"."hermesInboxMessage" DROP COLUMN "kind"');
    await queryRunner.query('DROP INDEX "core"."IDX_HERMES_MEDIA_FILE"');
    await queryRunner.query('DROP INDEX "core"."IDX_HERMES_MEDIA_SCOPE"');
    await queryRunner.query('DROP TABLE "core"."hermesMediaAsset"');
  }
}
