import assert from "node:assert/strict";
import test from "node:test";
import {
  BASELINE_FIXTURE_DRIFT,
  validateBaselineFixtureDrift,
  validateMediaSql,
} from "./check-hermes-media-migration-ci.mjs";

test("only the eight pinned raw canonical diagnostic entries are accepted", () => {
  assert.equal(BASELINE_FIXTURE_DRIFT.length, 8);
  validateBaselineFixtureDrift([...BASELINE_FIXTURE_DRIFT].reverse());
  assert.throws(() =>
    validateBaselineFixtureDrift([
      ...BASELINE_FIXTURE_DRIFT,
      'DROP TABLE "core"."workspace"',
    ]),
  );
  assert.throws(() =>
    validateBaselineFixtureDrift(BASELINE_FIXTURE_DRIFT.slice(1)),
  );
  assert.throws(() =>
    validateBaselineFixtureDrift([
      ...BASELINE_FIXTURE_DRIFT.slice(1),
      BASELINE_FIXTURE_DRIFT[1],
    ]),
  );
});

test("historical baseline deltas cannot leak into a media migration", () => {
  assert.throws(() =>
    validateMediaSql([...BASELINE_FIXTURE_DRIFT], [...BASELINE_FIXTURE_DRIFT]),
  );
});

import {
  IMPORT_STATE_DEFAULT_SQL,
  parseImportStateCatalogDefault,
  validateImportStateMetadataDefault,
} from "./check-hermes-media-migration-ci.mjs";

test("fixture default normalization accepts only the exact JSON object despite PostgreSQL key ordering", () => {
  assert.deepEqual(
    parseImportStateCatalogDefault(
      `'{"batches": [], "version": 1, "campaignIds": []}'::jsonb`,
    ),
    { version: 1, batches: [], campaignIds: [] },
  );
  for (const expression of [
    `'{"version":"1","batches":[],"campaignIds":[]}'::jsonb`,
    `'{"version":1,"batches":[],"campaignIds":[],"extra":true}'::jsonb`,
    `'{"version":1,"batches":["hidden"],"campaignIds":[]}'::jsonb`,
    `now()`,
    `'{}'::jsonb; DROP TABLE workspace`,
  ])
    assert.throws(() => parseImportStateCatalogDefault(expression));
});

test("only an exact function-valued metadata default may be canonicalized in the fixture", () => {
  validateImportStateMetadataDefault({
    kind: "function",
    source: "() => literal",
    sql: IMPORT_STATE_DEFAULT_SQL,
  });
  assert.throws(() =>
    validateImportStateMetadataDefault({
      kind: "object",
      source: "object",
      sql: IMPORT_STATE_DEFAULT_SQL,
    }),
  );
  assert.throws(() =>
    validateImportStateMetadataDefault({
      kind: "function",
      source: "() => literal",
      sql: "'{}'::jsonb",
    }),
  );
});
