import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSmtpDomainSql } from './check-hermes-smtp-domain-migration-ci.mjs';
import { assertDisposableTarget } from './check-hermes-migration-ci.mjs';

const up = [
  'ALTER TABLE "core"."emailingDomain" DROP CONSTRAINT "IDX_EMAILING_DOMAIN_DOMAIN_UNIQUE"',
  `CREATE TYPE "core"."emailingDomain_driver_enum" AS ENUM('LEGACY_GLOBAL', 'AWS_SES', 'RESEND', 'SMTP', 'LOG')`,
  `ALTER TABLE "core"."emailingDomain" ADD "driver" "core"."emailingDomain_driver_enum" NOT NULL DEFAULT 'LEGACY_GLOBAL'`,
  `CREATE UNIQUE INDEX "IDX_EMAILING_DOMAIN_GLOBAL_DOMAIN_UNIQUE" ON "core"."emailingDomain" ("domain") WHERE "driver" <> 'SMTP'`,
  'ALTER TABLE "core"."emailingDomain" ADD CONSTRAINT "IDX_EMAILING_DOMAIN_WORKSPACE_DRIVER_UNIQUE" UNIQUE ("workspaceId", "domain", "driver")',
];
const down = [
  'ALTER TABLE "core"."emailingDomain" DROP CONSTRAINT "IDX_EMAILING_DOMAIN_WORKSPACE_DRIVER_UNIQUE"',
  'DROP INDEX "core"."IDX_EMAILING_DOMAIN_GLOBAL_DOMAIN_UNIQUE"',
  'ALTER TABLE "core"."emailingDomain" DROP COLUMN "driver"',
  'DROP TYPE "core"."emailingDomain_driver_enum"',
  'ALTER TABLE "core"."emailingDomain" ADD CONSTRAINT "IDX_EMAILING_DOMAIN_DOMAIN_UNIQUE" UNIQUE ("domain")',
];

test('accepts only the narrow native SMTP provenance delta', () => {
  validateSmtpDomainSql(up, down);
  validateSmtpDomainSql([...up].reverse(), [...down].reverse());
});

test('rejects cloud ownership relaxation, nullable provenance, guessed backfill and destructive rollback', () => {
  for (const candidate of [
    up.map(sql => sql.replace(`WHERE "driver" <> 'SMTP'`, `WHERE "driver" = 'LEGACY_GLOBAL'`)),
    up.map(sql => sql.replace('NOT NULL', 'NULL')),
    up.map(sql => sql.replace("DEFAULT 'LEGACY_GLOBAL'", "DEFAULT 'SMTP'")),
    [...up, `UPDATE "core"."emailingDomain" SET "driver" = 'SMTP'`],
    [...up, 'DROP TABLE "core"."workspace"'],
    up.map(sql => sql + '; SELECT 1'),
  ]) assert.throws(() => validateSmtpDomainSql(candidate, down));
  assert.throws(() => validateSmtpDomainSql(up, [...down, 'DELETE FROM "core"."emailingDomain"']));
  assert.throws(() => validateSmtpDomainSql(up, down.slice(0, -1)));
});

test('refuses workstation, production or credentialed network targets before database access', () => {
  const env = {
    GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', GITHUB_RUN_ID: '123',
    GITHUB_WORKSPACE: '/fixture', PG_DATABASE_URL: 'postgres://postgres:123@127.0.0.1:5432/p0_ci',
    REDIS_URL: 'redis://127.0.0.1:6379',
  };
  assertDisposableTarget(env, '/fixture');
  for (const overrides of [
    { GITHUB_ACTIONS: 'false' }, { RUNNER_ENVIRONMENT: 'self-hosted' },
    { PG_DATABASE_URL: 'postgres://postgres:123@production.example:5432/p0_ci' },
    { PG_DATABASE_URL: 'postgres://postgres:123@127.0.0.1:5432/crm' },
    { REDIS_URL: 'redis://credential@127.0.0.1:6379' },
  ]) assert.throws(() => assertDisposableTarget({ ...env, ...overrides }, '/fixture'));
});
