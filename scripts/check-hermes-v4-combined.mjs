import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildIntegrationChildEnvironment,
  runIntegration,
  validateIntegrationEnvironment,
} from "./check-hermes-integration-p0.mjs";
import { runTenancyIntegration } from "./check-hermes-tenancy-ci.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = "apps/crm/ui/packages/twenty-server";
const FRONTEND = "apps/crm/ui/packages/twenty-front";
const ARTIFACTS = "hermes-v4-combined-artifacts";
const LEGACY_SUITES = [
  "test/integration/graphql/suites/hermes-structure-dashboard.integration-spec.ts",
  "test/integration/graphql/suites/hermes-prospection.integration-spec.ts",
  "src/engine/core-modules/hermes-messaging/__tests__/hermes-messaging.integration-spec.ts",
  "test/integration/graphql/suites/hermes-events.integration-spec.ts",
];
// Its own stage rather than LEGACY_SUITES: the only suite needing
// EMAILING_DOMAIN_DRIVER SMTP and a Testcontainers relay, and never yet
// executed. Isolated so its first run cannot take the four proven suites down.
export const CAMPAIGN_MAILBOX_SUITES = [
  "test/integration/graphql/suites/hermes-campaign-mailbox-journey.integration-spec.ts",
];
const FRONTEND_GROUPS = [
  "auth",
  "apollo",
  "hermes-wa-ui",
  "hermes-mailbox-ui",
  "hermes-admin-ui",
  "hermes-campaigns-ui",
  "hermes-wa-runtime",
  "hermes-mailbox-runtime",
  "hermes-admin-runtime",
  "hermes-campaigns-runtime",
];
const AUTH_EXTRAS = [
  "src/engine/core-modules/auth/token/services/__tests__/sso-exchange-scoped.service.spec.ts",
  "src/engine/guards/utils/__tests__/assert-expected-workspace-context.util.spec.ts",
  "src/engine/core-modules/domain/workspace-domains/utils/__tests__/is-canonical-frontend-origin.util.spec.ts",
  "src/engine/core-modules/auth/auth.resolver.spec.ts",
  "src/engine/core-modules/user-session/utils/extract-user-session-token-from-request.util.spec.ts",
];
// Specs the hermes-* scan cannot reach, because they live outside the hermes-*
// module tree. Listed explicitly so a combined run cannot pass without them.
// Reproduce one by hand without mutating the shared tree:
// NODE_PATH=<shared node_modules> node <shared>/jest/bin/jest.js \
//   --config jest.config.mjs --runInBand --runTestsByPath <specs>
export const BACKEND_EXTRAS = [
  "src/engine/core-modules/emailing-domain/services/__tests__/shared-smtp-domain.service.spec.ts",
  "src/modules/emailing/services/__tests__/campaign-message-channel.service.spec.ts",
  "src/engine/core-modules/workspace/structure-dashboard/__tests__/structure-dashboard.service.spec.ts",
  "src/engine/core-modules/emailing-domain/drivers/smtp/__tests__/smtp-emailing-domain-driver.spec.ts",
  "src/engine/core-modules/emailing-domain/drivers/__tests__/emailing-domain-driver.factory.spec.ts",
  "src/engine/core-modules/emailing-domain/utils/__tests__/get-sole-envelope-recipient.util.spec.ts",
  "src/engine/core-modules/emailing-domain/services/__tests__/unsubscribe-content.service.spec.ts",
  "src/modules/emailing/services/__tests__/campaign-unconfirmed-quarantine.spec.ts",
  "src/modules/emailing/services/__tests__/emailing-domain-sender-quarantine.spec.ts",
  "src/modules/emailing/utils/__tests__/resolve-campaign-batch-settlements.util.spec.ts",
  "src/modules/emailing/utils/__tests__/resolve-campaign-send-failure.util.spec.ts",
  "src/engine/core-modules/twenty-config/constants/__tests__/hermes-b2b-campaigns-config.spec.ts",
  "src/engine/core-modules/workspace/services/__tests__/workspace-campaign-optin.service.spec.ts",
  "src/modules/messaging/message-import-manager/drivers/smtp/providers/__tests__/smtp-client-deadline.spec.ts",
  // CJ-02, campagnes. L'acceptance importe nodemailer et tire lodash.chunk :
  // dépendances déclarées de l'arbre partagé, résolues en CI sans étape ni
  // symlink. Les échecs locaux venaient d'un symlink de worktree absent.
  "src/modules/emailing/services/__tests__/message-campaign-recipient-preview.service.spec.ts",
  "src/modules/emailing/services/__tests__/campaign-native-mailbox-smtp-acceptance.spec.ts",
  // DEFAULT_LOCALE : la locale vit sur l'adhésion, d'où une deuxième société
  // en anglais sur un déploiement français.
  "src/engine/core-modules/twenty-config/__tests__/default-locale.config-variable.spec.ts",
  "src/engine/core-modules/user-workspace/__tests__/user-workspace-locale.service.spec.ts",
  // CJ-01a : passe le bodyTemplate réel de l'éditeur au vrai
  // compileCampaignEmailContent et exige deux substitutions différentes.
  "src/modules/emailing/utils/__tests__/campaign-body-round-trip.util.spec.ts",
];
const CONNECTION_ASSERTIONS = [
  "stale-revision-after-advisory-lock-blocks-all-transaction-writes-pool1",
  "native-media-receive-asset-lock-then-D-rotation-zero-files-pool1",
  "native-inbox-ingest-messaging-lock-then-D-rotation-zero-messages-pool1",
  "native-D-rotation-preserves-OFF-ASSISTED-INHERIT-and-clears-AUTO-grant",
];

const checkedPath = (root, relative) => {
  const absolute = path.join(root, relative);
  // Named rather than a bare ENOENT: a declared spec absent from the branch
  // under test is the failure this list exists to produce.
  assert.ok(
    existsSync(absolute),
    `Declared suite missing from this checkout: ${relative}`,
  );
  assert.equal(
    realpathSync(absolute),
    absolute,
    "Suite symlinks are forbidden",
  );
  return absolute;
};

const suitesWithin = (root, relative, matches) => {
  const directory = checkedPath(root, relative);
  const files = [];
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const child = path.join(relative, item.name);
    assert.equal(
      item.isSymbolicLink(),
      false,
      "Suite tree symlinks are forbidden",
    );
    if (item.isDirectory()) files.push(...suitesWithin(root, child, matches));
    else if (item.isFile() && matches(child)) files.push(child);
  }
  return files;
};

export const discoverFrontendSuites = (root) => {
  const suites = FRONTEND_GROUPS.flatMap((group) => {
    const matches = suitesWithin(root, `src/modules/${group}`, (name) =>
      /\.(test|spec)\.tsx?$/.test(name),
    );
    assert.ok(matches.length, `Missing tested frontend group: ${group}`);
    return matches;
  });
  for (const file of [
    "src/modules/users/hooks/__tests__/useLoadCurrentUserSameOrigin.test.tsx",
    "src/modules/auth/hooks/__tests__/useAuthSameOrigin.test.tsx",
    "src/utils/i18n/__tests__/initialI18nActivate.test.ts",
    "src/modules/settings/data-model/fields/preview/utils/__tests__/getMultiSelectFieldPreviewValue.test.ts",
  ]) {
    checkedPath(root, file);
    suites.push(file);
  }
  return [...new Set(suites)].sort();
};

export const discoverBackendSuites = (root) => {
  const core = "src/engine/core-modules";
  const suites = [];
  for (const item of readdirSync(path.join(root, core), {
    withFileTypes: true,
  })) {
    if (item.name.startsWith("hermes-")) {
      assert.equal(
        item.isDirectory(),
        true,
        "Hermes unit root must be a directory",
      );
      suites.push(
        ...suitesWithin(root, `${core}/${item.name}`, (name) =>
          name.endsWith(".spec.ts"),
        ),
      );
    }
  }
  for (const directory of [
    `${core}/auth`,
    `${core}/user-session/services/__tests__`,
    `${core}/domain/workspace-domains`,
    "src/engine/guards/utils/__tests__",
  ]) {
    suites.push(
      ...suitesWithin(
        root,
        directory,
        (name) => name.includes("same-origin") && name.endsWith(".spec.ts"),
      ),
    );
  }
  for (const file of [...AUTH_EXTRAS, ...BACKEND_EXTRAS]) {
    checkedPath(root, file);
    suites.push(file);
  }
  for (const group of [
    "hermes-connections",
    "hermes-messaging",
    "hermes-media",
    "hermes-mail",
    "hermes-prospection",
  ])
    assert.ok(
      suites.some((name) => name.startsWith(`${core}/${group}/`)),
      `Missing backend suites: ${group}`,
    );
  return [...new Set(suites)].sort();
};

export const parseConnectionProof = (output) => {
  const line = output
    .split("\n")
    .find((value) => value.startsWith("HERMES_CONNECTION_PG:"));
  assert.ok(line, "Missing native PostgreSQL connections proof");
  const proof = JSON.parse(line.slice("HERMES_CONNECTION_PG:".length));
  assert.equal(proof.status, "passed");
  assert.equal(proof.poolSize, 1);
  assert.equal(proof.providerTraffic, false);
  for (const name of CONNECTION_ASSERTIONS)
    assert.ok(
      proof.assertions?.includes(name),
      `Missing PostgreSQL barrier: ${name}`,
    );
  return proof;
};

const unitTests = (relative, suites, name) => {
  const cwd = path.join(ROOT, relative);
  const result = spawnSync(
    process.execPath,
    [
      path.join(ROOT, "apps/crm/ui/node_modules/jest/bin/jest.js"),
      "--config",
      "jest.config.mjs",
      "--runInBand",
      "--reporters=default",
      ...(name === "backend-unit" ? ["--forceExit"] : []),
      "--json",
      "--outputFile",
      path.join(ROOT, ARTIFACTS, `${name}.json`),
      "--runTestsByPath",
      ...suites,
    ],
    { cwd, stdio: "inherit", timeout: 900_000 },
  );
  assert.equal(result.error, undefined, "Native unit test process failed");
  assert.equal(result.status, 0, "Native unit tests failed");
};

export const runCombined = async (mode) => {
  assert.ok(
    [
      "backend-unit",
      "frontend-unit",
      "postgres-legacy",
      "postgres-tenancy",
      "postgres-campaign-mailbox",
      "connections-pg",
    ].includes(mode),
    "Unknown fixed combined stage",
  );
  if (mode === "backend-unit" || mode === "frontend-unit") {
    const relative = mode === "backend-unit" ? SERVER : FRONTEND;
    const discover =
      mode === "backend-unit" ? discoverBackendSuites : discoverFrontendSuites;
    const suites = discover(path.join(ROOT, relative));
    mkdirSync(path.join(ROOT, ARTIFACTS), { recursive: true });
    unitTests(relative, suites, mode);
    return;
  }
  if (mode === "postgres-legacy") {
    await runIntegration({ suites: LEGACY_SUITES });
    return;
  }
  if (mode === "postgres-tenancy") {
    await runTenancyIntegration();
    return;
  }
  if (mode === "postgres-campaign-mailbox") {
    // Docker is required here and nowhere else in this harness. Said by name,
    // because a missing daemon means the suite is unrunnable, not passing.
    assert.ok(
      spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
        stdio: "ignore",
      }).status === 0,
      "Docker must be usable by Testcontainers for the campaign mailbox stage",
    );
    await runIntegration({
      suites: CAMPAIGN_MAILBOX_SUITES,
      emailingDomainDriver: "SMTP",
      allowSelfSignedSmtp: true,
      // Both spellings, since the fixture takes whichever getHost() returns.
      // The suite asserts its host is listed and refuses to run otherwise.
      allowedInternalHosts: ["localhost", "127.0.0.1"],
    });
    return;
  }
  // Both native integration wrappers already applied the official instance commands.
  validateIntegrationEnvironment(process.env);
  const secret = randomBytes(32).toString("hex");
  process.stdout.write(`::add-mask::${secret}\n`);
  const env = buildIntegrationChildEnvironment(process.env, secret);
  const sensitive = [
    secret,
    env.PG_DATABASE_URL,
    new URL(env.PG_DATABASE_URL).password,
    env.REDIS_URL,
  ];
  const redact = (input) =>
    sensitive
      .reduce((text, value) => text.replaceAll(value, "[redacted]"), input)
      .replace(
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
        "[redacted-jwt]",
      );
  const run = (filename, args = []) => {
    const result = spawnSync(
      process.execPath,
      [path.join(ROOT, "scripts", filename), ...args],
      {
        cwd: path.join(ROOT, SERVER),
        env,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    if (result.error || result.status !== 0)
      throw new Error(
        `${filename} failed\n${redact(`${result.stdout ?? ""}\n${result.stderr ?? ""}`).slice(-12000)}`,
      );
    return result.stdout;
  };
  const proof = parseConnectionProof(run("check-hermes-connections-pg.cjs"));
  const boots = ["SERVER", "WORKER"].map((mode) => {
    const output = run("check-hermes-connections-boot.cjs", [mode]);
    const line = output
      .split("\n")
      .find((value) => value.startsWith("HERMES_CONNECTION_BOOT:"));
    assert.ok(line, "Missing native composition bootstrap proof");
    const boot = JSON.parse(line.slice("HERMES_CONNECTION_BOOT:".length));
    assert.deepEqual(boot, {
      mode,
      initialized: true,
      sameNativeSingleton: true,
      listening: false,
    });
    return boot;
  });
  mkdirSync(path.join(ROOT, ARTIFACTS), { recursive: true });
  writeFileSync(
    path.join(ROOT, ARTIFACTS, "connections-pg.json"),
    JSON.stringify({ sha: process.env.GITHUB_SHA, proof, boots }, null, 2) +
      "\n",
  );
  console.info(
    "Native connections PostgreSQL barriers and both composition roots passed; no listening port or provider traffic",
  );
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    assert.equal(process.argv.length, 3, "Exactly one fixed stage is required");
    await runCombined(process.argv[2]);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Combined verification failed",
    );
    process.exitCode = 1;
  }
}
