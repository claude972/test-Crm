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
import { validateIntegrationEnvironment } from "./check-hermes-integration-p0.mjs";

const valid = {
  GITHUB_ACTIONS: "true",
  GITHUB_RUN_ID: "123",
  P0_INTEGRATION_DISPOSABLE: "true",
  PG_DATABASE_URL:
    "postgres://postgres:disposable-fixture@127.0.0.1:5432/p0_ci",
  REDIS_URL: "redis://127.0.0.1:6379",
};
const root = mkdtempSync(path.join(os.tmpdir(), "hermes-integration-guards-"));
test.after(() => rmSync(root, { recursive: true, force: true }));
test("accepts explicit disposable CI configuration without connecting to services", () => {
  assert.doesNotThrow(() => validateIntegrationEnvironment(valid, root));
});
for (const [label, override] of [
  ["local execution", { GITHUB_ACTIONS: "false" }],
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
