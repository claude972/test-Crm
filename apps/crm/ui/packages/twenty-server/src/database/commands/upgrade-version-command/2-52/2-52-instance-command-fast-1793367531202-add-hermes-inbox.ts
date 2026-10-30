import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.52.0', 1793367531202)
export class AddHermesInboxFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "core"."hermesMailCursor" ("workspaceId" uuid NOT NULL, "connectionId" character varying(100) NOT NULL, "mailbox" character varying(128) NOT NULL, "uidValidity" character varying(32) NOT NULL, "lastUid" bigint NOT NULL DEFAULT \'0\', "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a793f80cf4364eeff3d43f59682" PRIMARY KEY ("workspaceId", "connectionId", "mailbox"))',
    );
    await queryRunner.query(
      'CREATE TABLE "core"."hermesConversation" ("id" uuid NOT NULL, "workspaceId" uuid NOT NULL, "channel" character varying(16) NOT NULL, "providerConnectionId" character varying(512) NOT NULL, "providerConversationId" character varying(512) NOT NULL, "contactHandle" character varying(512) NOT NULL, "subject" character varying(512), "lastMessageAt" TIMESTAMP WITH TIME ZONE NOT NULL, "botMode" character varying(16) NOT NULL DEFAULT \'MANUAL\', "botOwnerUserWorkspaceId" uuid, "botModeUpdatedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c31c2d3a819172262dc0cb34fef" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_HERMES_CONVERSATION_INBOX" ON "core"."hermesConversation" ("workspaceId", "lastMessageAt", "id") ',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_HERMES_CONVERSATION_PROVIDER" ON "core"."hermesConversation" ("workspaceId", "channel", "providerConnectionId", "providerConversationId") ',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_HERMES_CONVERSATION_TENANT_ID" ON "core"."hermesConversation" ("workspaceId", "id") ',
    );
    await queryRunner.query(
      'CREATE TABLE "core"."hermesInboxMessage" ("id" uuid NOT NULL, "workspaceId" uuid NOT NULL, "conversationId" uuid NOT NULL, "channel" character varying(16) NOT NULL, "providerConnectionId" character varying(512) NOT NULL, "providerMessageId" character varying(512), "clientRequestId" uuid, "direction" character varying(16) NOT NULL, "status" character varying(24) NOT NULL, "providerMetadata" jsonb, "text" text NOT NULL, "contentDigest" character varying(64) NOT NULL, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL, "errorCode" character varying(64), "canonicalMessageId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9ede1f30f5555da72f8bb0f3c37" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_HERMES_MESSAGE_INBOX" ON "core"."hermesInboxMessage" ("workspaceId", "conversationId", "occurredAt", "id") ',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_HERMES_MESSAGE_CLIENT" ON "core"."hermesInboxMessage" ("workspaceId", "clientRequestId") WHERE "clientRequestId" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_HERMES_MESSAGE_PROVIDER" ON "core"."hermesInboxMessage" ("workspaceId", "channel", "providerConnectionId", "providerMessageId") WHERE "providerMessageId" IS NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."hermesMailCursor" ADD CONSTRAINT "FK_c7087f11546c7606587474a02f5" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."hermesConversation" ADD CONSTRAINT "FK_5372d044da2e291159a087ca307" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."hermesInboxMessage" ADD CONSTRAINT "FK_e5874f3ef1858131f3d49d5b07d" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."hermesInboxMessage" ADD CONSTRAINT "FK_e40637afd602ac1d90677416bf1" FOREIGN KEY ("workspaceId", "conversationId") REFERENCES "core"."hermesConversation"("workspaceId","id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "core"."hermesInboxMessage" DROP CONSTRAINT "FK_e40637afd602ac1d90677416bf1"',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."hermesInboxMessage" DROP CONSTRAINT "FK_e5874f3ef1858131f3d49d5b07d"',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."hermesConversation" DROP CONSTRAINT "FK_5372d044da2e291159a087ca307"',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."hermesMailCursor" DROP CONSTRAINT "FK_c7087f11546c7606587474a02f5"',
    );
    await queryRunner.query('DROP INDEX "core"."IDX_HERMES_MESSAGE_PROVIDER"');
    await queryRunner.query('DROP INDEX "core"."IDX_HERMES_MESSAGE_CLIENT"');
    await queryRunner.query('DROP INDEX "core"."IDX_HERMES_MESSAGE_INBOX"');
    await queryRunner.query('DROP TABLE "core"."hermesInboxMessage"');
    await queryRunner.query(
      'DROP INDEX "core"."IDX_HERMES_CONVERSATION_TENANT_ID"',
    );
    await queryRunner.query(
      'DROP INDEX "core"."IDX_HERMES_CONVERSATION_PROVIDER"',
    );
    await queryRunner.query(
      'DROP INDEX "core"."IDX_HERMES_CONVERSATION_INBOX"',
    );
    await queryRunner.query('DROP TABLE "core"."hermesConversation"');
    await queryRunner.query('DROP TABLE "core"."hermesMailCursor"');
  }
}
