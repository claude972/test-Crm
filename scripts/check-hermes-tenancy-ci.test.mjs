import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  buildIntegrationChildEnvironment,
  validateIntegrationMode,
  SAME_ORIGIN_SUITE,
} from "./check-hermes-integration-p0.mjs";

test("legacy runner remains disabled even with ambient opt-in and custom origin", () => {
  const env = buildIntegrationChildEnvironment(
    {
      IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED: "true",
      IS_MULTIWORKSPACE_ENABLED: "true",
      FRONTEND_URL: "https://foreign.example",
    },
    "synthetic-secret",
  );
  assert.equal(env.IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED, "false");
  assert.equal(env.IS_MULTIWORKSPACE_ENABLED, "false");
  assert.equal(env.FRONTEND_URL, "http://127.0.0.1:3001");
});
test("isolated mode fixes same-origin true while subdomains stay disabled", () => {
  const env = buildIntegrationChildEnvironment({}, "synthetic-secret", {
    sameOriginMultiworkspace: true,
  });
  assert.equal(env.IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED, "true");
  assert.equal(env.IS_MULTIWORKSPACE_ENABLED, "false");
  assert.equal(env.FRONTEND_URL, "http://127.0.0.1:3001");
});
test("same-origin mode accepts only the exact native tenancy suite", () => {
  assert.doesNotThrow(() => validateIntegrationMode([SAME_ORIGIN_SUITE], true));
  for (const suites of [
    [],
    ["test/integration/graphql/suites/hermes-other.integration-spec.ts"],
    [SAME_ORIGIN_SUITE, SAME_ORIGIN_SUITE],
  ])
    assert.throws(() => validateIntegrationMode(suites, true));
  assert.doesNotThrow(() => validateIntegrationMode(["legacy-suite"]));
});
test("wrapper owns suite and opt-in, not CLI or ambient application configuration", () => {
  const source = readFileSync(
    new URL("./check-hermes-tenancy-ci.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /sameOriginMultiworkspace: true/);
  assert.match(source, /suites: \[SAME_ORIGIN_SUITE\]/);
  assert.doesNotMatch(source, /process\.argv\.slice|process\.env/);
});
