import assert from "node:assert/strict";
import test from "node:test";
import {
  BASELINE_FIXTURE_DRIFT,
  validateBaselineFixtureDrift,
  validateMediaSql,
} from "./check-hermes-media-migration-ci.mjs";

test("only the eight reviewed historical deltas may prepare the disposable baseline", () => {
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
