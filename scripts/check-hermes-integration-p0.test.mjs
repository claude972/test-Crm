import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildIntegrationChildEnvironment,
  validateIntegrationEnvironment,
  validateIntegrationSuitePaths,
} from "./check-hermes-integration-p0.mjs";

const root = mkdtempSync(path.join(os.tmpdir(), "hermes-integration-guards-"));
const valid = {
  RUNNER_ENVIRONMENT: "github-hosted",
  GITHUB_WORKSPACE: root,
  GITHUB_ACTIONS: "true",
  GITHUB_RUN_ID: "123",
  P0_INTEGRATION_DISPOSABLE: "true",
  PG_DATABASE_URL: "postgres://postgres:123@127.0.0.1:5432/p0_ci",
  REDIS_URL: "redis://127.0.0.1:6379",
};
test.after(() => rmSync(root, { recursive: true, force: true }));
test("accepts explicit disposable CI configuration without connecting to services", () => {
  assert.doesNotThrow(() => validateIntegrationEnvironment(valid, root));
});
for (const [label, override] of [
  ["local execution", { GITHUB_ACTIONS: "false" }],
  ["self-hosted runner", { RUNNER_ENVIRONMENT: "self-hosted" }],
  ["missing runner identity", { RUNNER_ENVIRONMENT: undefined }],
  ["another checkout", { GITHUB_WORKSPACE: os.tmpdir() }],
  ["missing checkout", { GITHUB_WORKSPACE: undefined }],
  [
    "wrong Postgres user",
    { PG_DATABASE_URL: "postgres://admin:123@127.0.0.1:5432/p0_ci" },
  ],
  [
    "another run password",
    { PG_DATABASE_URL: "postgres://postgres:122@127.0.0.1:5432/p0_ci" },
  ],
  ["Redis user", { REDIS_URL: "redis://user@127.0.0.1:6379" }],
  ["Redis password", { REDIS_URL: "redis://:password@127.0.0.1:6379" }],
  ["Redis namespace", { REDIS_URL: "redis://127.0.0.1:6379/1" }],
  ["Redis query overrides", { REDIS_URL: "redis://127.0.0.1:6379?db=1" }],
  ["self-signed SSL override", { PG_SSL_ALLOW_SELF_SIGNED: "true" }],
  ["invalid SSL override", { PG_SSL_ALLOW_SELF_SIGNED: "1" }],
  ["libpq SSL override", { PGSSLMODE: "require" }],
  ["libpq SSL certificate", { PGSSLROOTCERT: "/tmp/cert" }],
  ["libpq SSL key", { PGSSLKEY: "/tmp/key" }],
  ["libpq options override", { PGOPTIONS: "-c search_path=other" }],
  ["missing reset acknowledgement", { P0_INTEGRATION_DISPOSABLE: undefined }],
  [
    "remote Postgres",
    {
      PG_DATABASE_URL: "postgres://postgres:fixture@db.example.com:5432/p0_ci",
    },
  ],
  [
    "another database",
    {
      PG_DATABASE_URL: "postgres://postgres:fixture@127.0.0.1:5432/production",
    },
  ],
  [
    "Postgres query overrides",
    { PG_DATABASE_URL: `${valid.PG_DATABASE_URL}?host=db.example.com` },
  ],
  ["remote Redis", { REDIS_URL: "redis://cache.example.com:6379" }],
  ["old reset status", { INTEGRATION_TEST_DB_RESET_STATUS_FILE: "/tmp/ready" }],
])
  test(`rejects ${label} before subprocess creation`, () => {
    assert.throws(() =>
      validateIntegrationEnvironment({ ...valid, ...override }, root),
    );
  });
test("rejects private env and even broken symlinks before any reset", () => {
  const server = path.join(root, "apps/crm/ui/packages/twenty-server");
  mkdirSync(server, { recursive: true });
  const filename = path.join(server, ".env.test");
  writeFileSync(filename, "SYNTHETIC=true");
  assert.throws(() => validateIntegrationEnvironment(valid, root));
  rmSync(filename);
  symlinkSync("/nonexistent-hermes-fixture-env", filename);
  assert.throws(() => validateIntegrationEnvironment(valid, root));
  rmSync(filename);
});

test("child env excludes ambient credentials and runtime injection while preserving explicit fixture configuration", () => {
  const source = {
    ...valid,
    PATH: "/usr/bin",
    HOME: "/home/runner",
    TMPDIR: "/tmp",
    TZ: "UTC",
    GITHUB_TOKEN: "synthetic-github",
    AWS_SECRET_ACCESS_KEY: "synthetic-aws",
    SMTP_PASSWORD: "synthetic-smtp",
    APP_SECRET: "ambient-secret",
    NODE_OPTIONS: "--require /tmp/inject.js",
    NODE_PATH: "/tmp/foreign",
    CLICKHOUSE_URL: "http://foreign",
    EMAIL_DRIVER: "smtp",
    EMAILING_DOMAIN_DRIVER: "SMTP",
    PG_SSL_ALLOW_SELF_SIGNED: "true",
  };
  const child = buildIntegrationChildEnvironment(source, "ephemeral-fixture");
  for (const key of [
    "GITHUB_TOKEN",
    "AWS_SECRET_ACCESS_KEY",
    "SMTP_PASSWORD",
    "NODE_PATH",
    "CLICKHOUSE_URL",
    "PG_SSL_ALLOW_SELF_SIGNED",
  ])
    assert.equal(Object.hasOwn(child, key), false);
  assert.equal(child.PATH, source.PATH);
  assert.equal(child.HOME, source.HOME);
  assert.equal(child.PG_DATABASE_URL, valid.PG_DATABASE_URL);
  assert.equal(child.REDIS_URL, valid.REDIS_URL);
  assert.equal(child.APP_SECRET, "ephemeral-fixture");
  assert.equal(child.NODE_OPTIONS, "--max-old-space-size=6144");
  assert.equal(child.EMAIL_DRIVER, "logger");
  assert.equal(child.EMAILING_DOMAIN_DRIVER, "LOG");
  assert.equal(child.IS_CONFIG_VARIABLES_IN_DB_ENABLED, "false");
  assert.equal(child.TELEMETRY_ENABLED, "false");
});

test("credential validation errors do not contain the rejected secret", () => {
  const secret = "synthetic-forbidden-secret";
  for (const overrides of [
    { PG_DATABASE_URL: `postgres://postgres:${secret}@127.0.0.1:5432/p0_ci` },
    { REDIS_URL: `redis://:${secret}@127.0.0.1:6379` },
  ]) {
    assert.throws(
      () => validateIntegrationEnvironment({ ...valid, ...overrides }, root),
      (error) => !error.message.includes(secret),
    );
  }
});

test("allows the exact native inbox suite and existing Hermes suites before reset", () => {
  const server = path.join(root, "suite-validation");
  const dashboard =
    "test/integration/graphql/suites/hermes-structure-dashboard.integration-spec.ts";
  const inbox =
    "src/engine/core-modules/hermes-messaging/__tests__/hermes-messaging.integration-spec.ts";
  for (const suite of [dashboard, inbox]) {
    const file = path.join(server, suite);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, "// Syntax fixture only; not executed.");
  }
  assert.doesNotThrow(() =>
    validateIntegrationSuitePaths([dashboard, inbox], server),
  );
  for (const suite of [
    "../outside.integration-spec.ts",
    "/tmp/outside.integration-spec.ts",
    "src/engine/core-modules/other/__tests__/hermes-messaging.integration-spec.ts",
    "src/engine/core-modules/hermes-messaging/__tests__/other.integration-spec.ts",
    inbox + "/../other.ts",
    "--runInBand",
  ]) {
    assert.throws(() => validateIntegrationSuitePaths([suite], server));
  }
  rmSync(path.join(server, inbox));
  symlinkSync(path.join(server, dashboard), path.join(server, inbox));
  assert.throws(() => validateIntegrationSuitePaths([inbox], server));
});
