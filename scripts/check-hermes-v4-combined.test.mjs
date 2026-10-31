import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildIntegrationChildEnvironment } from "./check-hermes-integration-p0.mjs";
import {
  BACKEND_EXTRAS,
  CAMPAIGN_MAILBOX_SUITES,
  discoverBackendSuites,
  discoverFrontendSuites,
  parseConnectionProof,
  runCombined,
} from "./check-hermes-v4-combined.mjs";

const frontendFixture = () => {
  const root = realpathSync(
    mkdtempSync(path.join(tmpdir(), "hermes-combined-suites-")),
  );
  const put = (filename) => {
    const absolute = path.join(root, filename);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, "");
  };
  for (const group of [
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
  ])
    put(`src/modules/${group}/__tests__/behavior.test.tsx`);
  for (const filename of [
    "src/modules/users/hooks/__tests__/useLoadCurrentUserSameOrigin.test.tsx",
    "src/modules/auth/hooks/__tests__/useAuthSameOrigin.test.tsx",
    "src/utils/i18n/__tests__/initialI18nActivate.test.ts",
    "src/modules/settings/data-model/fields/preview/utils/__tests__/getMultiSelectFieldPreviewValue.test.ts",
  ])
    put(filename);
  return root;
};

test("frontend discovery fails closed when a delivered UI lacks its runtime or tests", () => {
  const root = frontendFixture();
  try {
    assert.equal(discoverFrontendSuites(root).length, 14);
    rmSync(path.join(root, "src/modules/hermes-mailbox-runtime"), {
      recursive: true,
    });
    assert.throws(() => discoverFrontendSuites(root));
    mkdirSync(path.join(root, "src/modules/hermes-mailbox-runtime"));
    assert.throws(
      () => discoverFrontendSuites(root),
      /Missing tested frontend group/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("suite discovery rejects linked trees rather than testing another checkout", () => {
  const root = frontendFixture();
  try {
    const mailbox = path.join(root, "src/modules/hermes-mailbox-runtime");
    rmSync(mailbox, { recursive: true });
    symlinkSync(
      path.join(root, "src/modules/hermes-wa-runtime"),
      mailbox,
      "dir",
    );
    assert.throws(() => discoverFrontendSuites(root), /symlinks are forbidden/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const proof = () => ({
  status: "passed",
  poolSize: 1,
  providerTraffic: false,
  assertions: [
    "stale-revision-after-advisory-lock-blocks-all-transaction-writes-pool1",
    "native-media-receive-asset-lock-then-D-rotation-zero-files-pool1",
    "native-inbox-ingest-messaging-lock-then-D-rotation-zero-messages-pool1",
    "native-D-rotation-preserves-OFF-ASSISTED-INHERIT-and-clears-AUTO-grant",
  ],
});
const output = (value) => "HERMES_CONNECTION_PG:" + JSON.stringify(value);

test("a successful process without every native PostgreSQL barrier is not accepted as proof", () => {
  assert.deepEqual(parseConnectionProof(output(proof())), proof());
  assert.throws(() => parseConnectionProof("process finished normally"));
  for (let index = 0; index < proof().assertions.length; index++) {
    const partial = proof();
    partial.assertions.splice(index, 1);
    assert.throws(
      () => parseConnectionProof(output(partial)),
      /Missing PostgreSQL barrier/,
    );
  }
  assert.throws(() =>
    parseConnectionProof(output({ ...proof(), providerTraffic: true })),
  );
  assert.throws(() =>
    parseConnectionProof(output({ ...proof(), status: "failed" })),
  );
});

test("arbitrary suites and flags cannot become an executable combined stage", async () => {
  for (const mode of [
    undefined,
    "--same-origin=true",
    "custom-suite.ts",
    "postgres-tenancy --extra",
  ])
    await assert.rejects(runCombined(mode), /Unknown fixed combined stage/);
});

test("backend discovery covers the auth and messaging lots of this checkout", () => {
  const suites = discoverBackendSuites(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../apps/crm/ui/packages/twenty-server",
    ),
  );
  for (const lot of [
    "src/engine/core-modules/auth/",
    "src/engine/core-modules/hermes-messaging/",
    "src/engine/core-modules/hermes-mail/",
  ])
    assert.ok(
      suites.some((name) => name.startsWith(lot)),
      `Missing discovered lot: ${lot}`,
    );
  assert.ok(
    suites.every((name) => name.endsWith(".spec.ts")),
    "Only unit specs may reach the combined backend stage",
  );
  assert.deepEqual([...new Set(suites)], suites, "Suites must not repeat");
  // Every explicit extra must actually be executed, not merely declared.
  for (const extra of BACKEND_EXTRAS)
    assert.ok(
      suites.includes(extra),
      `Declared extra never reaches the run: ${extra}`,
    );
  // The hermes-* scan recurses, so a spec in a nested __tests__ under a
  // hermes-* root needs no declaration. Pinned here because the alternative is
  // trusting a reading of the scan, and a wrong reading means a silent hole or
  // a redundant entry.
  assert.ok(
    suites.some((name) =>
      name.startsWith(
        "src/engine/core-modules/hermes-prospection/intake/__tests__/",
      ),
    ),
    "The hermes-* scan must reach nested __tests__ directories",
  );
});

// Asserts the LIST, so it holds on a checkout that does not yet carry the
// specs. discoverBackendSuites then fails closed, by name, on any branch where
// a declared spec is absent.
test("specs outside the hermes-* scan stay declared explicitly", () => {
  for (const required of [
    "src/modules/emailing/services/__tests__/message-campaign-recipient-preview.service.spec.ts",
    "src/modules/emailing/services/__tests__/campaign-native-mailbox-smtp-acceptance.spec.ts",
    "src/engine/core-modules/twenty-config/__tests__/default-locale.config-variable.spec.ts",
    "src/engine/core-modules/user-workspace/__tests__/user-workspace-locale.service.spec.ts",
    "src/modules/emailing/utils/__tests__/campaign-body-round-trip.util.spec.ts",
  ])
    assert.ok(
      BACKEND_EXTRAS.includes(required),
      `A combined run would pass without executing: ${required}`,
    );

  for (const extra of BACKEND_EXTRAS) {
    assert.ok(
      extra.endsWith(".spec.ts"),
      `Only unit specs belong in the extras: ${extra}`,
    );
    // An entry the scan already reaches would hide a hole instead of covering
    // one, and would double-run the spec.
    assert.ok(
      !/\/hermes-[^/]+\//.test(extra),
      `Already covered by the hermes-* scan, remove it: ${extra}`,
    );
  }

  assert.deepEqual(
    [...new Set(BACKEND_EXTRAS)],
    BACKEND_EXTRAS,
    "Extras must not repeat",
  );

  // An integration suite among the unit extras would run with no PostgreSQL.
  // The suffix is -spec.ts, not .spec.ts, so the check above already rejects
  // it; asserted by name so that stays true if it is ever reworded.
  for (const extra of BACKEND_EXTRAS)
    assert.ok(
      !extra.includes("integration-spec") && !extra.startsWith("test/"),
      `Integration suites belong in an integration stage: ${extra}`,
    );
});

test("the campaign mailbox suite is isolated and asks for SMTP explicitly", () => {
  assert.deepEqual(CAMPAIGN_MAILBOX_SUITES, [
    "test/integration/graphql/suites/hermes-campaign-mailbox-journey.integration-spec.ts",
  ]);
  // The validator the integration runner applies to every suite path.
  for (const suite of CAMPAIGN_MAILBOX_SUITES)
    assert.match(
      suite,
      /^test\/integration\/graphql\/suites\/hermes-[a-z0-9-]+\.integration-spec\.ts$/,
    );

  // The four proven suites keep their own stage, and their driver.
  const legacy = buildIntegrationChildEnvironment({}, "synthetic-secret");
  assert.equal(legacy.EMAILING_DOMAIN_DRIVER, "LOG");
  assert.equal(legacy.IMAP_SMTP_ALLOW_SELF_SIGNED, undefined);

  const mailbox = buildIntegrationChildEnvironment({}, "synthetic-secret", {
    emailingDomainDriver: "SMTP",
    allowSelfSignedSmtp: true,
  });
  assert.equal(mailbox.EMAILING_DOMAIN_DRIVER, "SMTP");
  assert.equal(mailbox.IMAP_SMTP_ALLOW_SELF_SIGNED, "true");

  // A driver nobody vetted, and self-signed acceptance while mail goes nowhere
  // near a socket, are both refused.
  assert.throws(
    () =>
      buildIntegrationChildEnvironment({}, "synthetic-secret", {
        emailingDomainDriver: "RESEND",
      }),
    /Unknown integration emailing driver/,
  );
  assert.throws(
    () =>
      buildIntegrationChildEnvironment({}, "synthetic-secret", {
        allowSelfSignedSmtp: true,
      }),
    /Self-signed SMTP acceptance requires the SMTP driver/,
  );
});
