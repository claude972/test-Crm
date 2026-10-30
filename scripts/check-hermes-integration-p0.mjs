import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = "apps/crm/ui/packages/twenty-server";
const DEFAULT_SUITE =
  "test/integration/graphql/suites/hermes-structure-dashboard.integration-spec.ts";
const exists = (filename) => {
  try {
    lstatSync(filename);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

export const validateIntegrationEnvironment = (env, root = ROOT) => {
  assert.equal(env.GITHUB_ACTIONS, "true", "Disposable GitHub Actions only");
  assert.match(env.GITHUB_RUN_ID ?? "", /^\d+$/, "A CI run ID is required");
  assert.equal(
    env.P0_INTEGRATION_DISPOSABLE,
    "true",
    "Explicit disposable reset acknowledgement required",
  );
  const database = new URL(env.PG_DATABASE_URL ?? "");
  assert.ok(
    ["postgres:", "postgresql:"].includes(database.protocol),
    "Postgres protocol required",
  );
  assert.equal(database.hostname, "127.0.0.1", "Postgres must be loopback");
  assert.equal(database.port, "5432");
  assert.equal(database.pathname, "/p0_ci", "Only p0_ci may be reset");
  assert.equal(database.search, "");
  assert.equal(database.hash, "");
  assert.ok(
    database.password.length > 0,
    "Fresh CI database password required",
  );
  assert.notEqual(env.PG_SSL_ALLOW_SELF_SIGNED, "true");
  const redis = new URL(env.REDIS_URL ?? "");
  assert.equal(redis.protocol, "redis:");
  assert.equal(redis.hostname, "127.0.0.1", "Redis must be loopback");
  assert.equal(redis.port, "6379");
  assert.ok(["", "/", "/0"].includes(redis.pathname));
  assert.equal(redis.search, "");
  assert.equal(redis.hash, "");
  for (const directory of [
    root,
    path.join(root, "apps/crm/ui"),
    path.join(root, SERVER),
  ]) {
    for (const filename of [
      ".env",
      ".env.test",
      ".env.local",
      ".env.test.local",
    ]) {
      assert.equal(
        exists(path.join(directory, filename)),
        false,
        "Private environment files must be absent",
      );
    }
  }
  assert.equal(
    env.INTEGRATION_TEST_DB_RESET_STATUS_FILE,
    undefined,
    "Do not trust a previous reset status file",
  );
};

export const runIntegration = async () => {
  // The native reset precedes Jest's globalSetup and suite-level assertions.
  validateIntegrationEnvironment(process.env);
  const cwd = path.join(ROOT, SERVER);
  const suites = process.argv.slice(2);
  if (!suites.length) suites.push(DEFAULT_SUITE);
  for (const suite of suites) {
    assert.match(
      suite,
      /^test\/integration\/graphql\/suites\/hermes-[a-z0-9-]+\.integration-spec\.ts$/,
      "Only explicit Hermes integration suites",
    );
    assert.equal(
      realpathSync(path.join(cwd, suite)),
      path.join(realpathSync(cwd), suite),
      "Suite symlinks are forbidden",
    );
  }
  const jest = path.resolve(cwd, "../../node_modules/jest/bin/jest.js");
  for (const file of [
    jest,
    "dist/database/scripts/truncate-db.js",
    "dist/database/scripts/setup-db.js",
    "dist/command/command.js",
  ].map((file) => path.resolve(cwd, file))) {
    assert.ok(
      exists(file),
      "Build backend and install dependencies before integration",
    );
  }
  const appSecret = randomBytes(32).toString("hex");
  process.stdout.write(`::add-mask::${appSecret}\n`);
  const env = {
    ...process.env,
    NODE_ENV: "test",
    NODE_HOST: "127.0.0.1",
    NODE_PORT: "4000",
    SERVER_URL: "http://127.0.0.1:4000",
    FRONTEND_URL: "http://127.0.0.1:3001",
    APP_SECRET: appSecret,
    REDIS_CACHE_PREFIX: `hermes-integration-${process.env.GITHUB_RUN_ID}`,
    EMAIL_DRIVER: "logger",
    EMAILING_DOMAIN_DRIVER: "LOG",
    TELEMETRY_ENABLED: "false",
    IS_BILLING_ENABLED: "false",
    IS_FDW_ENABLED: "false",
    IS_CONFIG_VARIABLES_IN_DB_ENABLED: "false",
    IS_MULTIWORKSPACE_ENABLED: "false",
  };
  delete env.CLICKHOUSE_URL;
  const secrets = [
    appSecret,
    process.env.PG_DATABASE_URL,
    process.env.REDIS_URL,
    decodeURIComponent(new URL(process.env.PG_DATABASE_URL).password),
    decodeURIComponent(new URL(process.env.REDIS_URL).password),
  ].filter(Boolean);
  const redact = (value) => {
    let result = value;
    for (const secret of secrets)
      result = result.replaceAll(secret, "[redacted]");
    return result.replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[redacted-jwt]",
    );
  };
  const run = (stage, args, timeoutMs) =>
    new Promise((resolve, reject) => {
      console.info(`Hermes integration: ${stage}`);
      const child = spawn(process.execPath, args, {
        cwd,
        env,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      for (const stream of [child.stdout, child.stderr])
        stream.on("data", (data) => {
          output = (output + data).slice(-32_000);
        });
      const kill = (signal) => {
        if (!child.pid) return;
        try {
          process.kill(-child.pid, signal);
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      };
      const stop = () => kill("SIGKILL");
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
      const timer = setTimeout(stop, timeoutMs);
      child.once("error", reject);
      child.once("close", (code) => {
        clearTimeout(timer);
        process.off("SIGINT", stop);
        process.off("SIGTERM", stop);
        kill("SIGKILL");
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `${stage} failed (${code ?? "signal"})\n${redact(output).slice(-16_000)}`,
            ),
          );
      });
    });
  console.info(
    "Hermes integration: guarded destructive reset of fresh CI p0_ci; no private env files",
  );
  await run("reset", ["dist/database/scripts/truncate-db.js"], 300_000);
  await run("initialize", ["dist/database/scripts/setup-db.js"], 300_000);
  await run(
    "migrate",
    [
      "dist/command/command.js",
      "run-instance-commands",
      "--force",
      "--include-slow",
    ],
    600_000,
  );
  await run(
    "flush disposable cache",
    ["dist/command/command.js", "cache:flush"],
    120_000,
  );
  await run(
    "seed native fixtures",
    ["dist/command/command.js", "workspace:seed:dev"],
    600_000,
  );
  await run(
    "selected native integration suites",
    [
      "--require",
      "tsconfig-paths/register",
      jest,
      "--config",
      "./jest-integration.config.ts",
      "--runInBand",
      "--runTestsByPath",
      ...suites,
    ],
    1_200_000,
  );
  console.info("Hermes integration: selected suites passed");
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await runIntegration();
  } catch (error) {
    // URL errors may retain input credentials as enumerable properties.
    console.error(
      error instanceof Error ? error.message : "Integration failed",
    );
    process.exitCode = 1;
  }
}
