import assert from "node:assert/strict";
import test from "node:test";
import {
  BASELINE_FIXTURE_DRIFT,
  validateBaselineFixtureDrift,
  validateConnectionsSql,
} from "./check-hermes-connections-migration-ci.mjs";

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

test("historical baseline deltas cannot leak into a connections migration", () => {
  assert.throws(() =>
    validateConnectionsSql(
      [...BASELINE_FIXTURE_DRIFT],
      [...BASELINE_FIXTURE_DRIFT],
    ),
  );
});

import {
  IMPORT_STATE_DEFAULT_SQL,
  parseImportStateCatalogDefault,
  validateImportStateMetadataDefault,
} from "./check-hermes-connections-migration-ci.mjs";

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

test('the connections allowlist accepts only its six native DDL statements', () => {
  const indexes = [
    'UQ_hermesConnection_workspace_kind',
    'IDX_HERMES_CONNECTION_ID',
    'IDX_HERMES_CONNECTION_ACTIVE_SECRET',
    'IDX_HERMES_CONNECTION_ACTIVE_EVOLUTION',
  ];
  const up = [
    'CREATE TABLE "core"."hermesConnection" ("id" uuid NOT NULL)',
    ...indexes.map(name => `CREATE UNIQUE INDEX "${name}" ON "core"."hermesConnection" ("id")`),
    'ALTER TABLE "core"."hermesConnection" ADD CONSTRAINT "FK_fixture" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
  ];
  const down = [
    'ALTER TABLE "core"."hermesConnection" DROP CONSTRAINT "FK_fixture"',
    ...indexes.map(name => `DROP INDEX "core"."${name}"`),
    'DROP TABLE "core"."hermesConnection"',
  ];
  validateConnectionsSql(up, down);
  assert.throws(() => validateConnectionsSql(up.map(sql => sql.replaceAll('hermesConnection', 'workspace')), down));
  assert.throws(() => validateConnectionsSql([...up, 'DROP TABLE "core"."hermesMediaAsset"'], down));
  assert.throws(() => validateConnectionsSql(up.map(sql => sql + '; SELECT 1'), down));
});
