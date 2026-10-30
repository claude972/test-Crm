// Invoked only by the disposable hosted-PG migration driver; no user environment.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const fromServer = (name) => require(path.join(process.cwd(), "dist", name));
const { connectionSource: source } = fromServer(
  "database/typeorm/core/core.datasource.js",
);
const { HermesConnectionsService } = fromServer(
  "engine/core-modules/hermes-connections/hermes-connections.service.js",
);
const { HermesConnectionEntity } = fromServer(
  "engine/core-modules/hermes-connections/hermes-connection.entity.js",
);
const { SecretEncryptionService } = fromServer(
  "engine/core-modules/secret-encryption/secret-encryption.service.js",
);
const { ConnectedAccountTokenEncryptionService } = fromServer(
  "engine/metadata-modules/connected-account/services/connected-account-token-encryption.service.js",
);

(async () => {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  const { Client } = require(path.join(process.cwd(), "../../node_modules/pg"));
  const gate = new Client({ connectionString: process.env.PG_DATABASE_URL });
  const key = process.env.APP_SECRET;
  const encryption = new SecretEncryptionService({
    get: (name) => (name === "APP_SECRET" ? key : undefined),
  });
  // Storage/CAS proof uses an explicit allowed-actor fixture. This is not a claim
  // that PostgreSQL replaces native user/role authorization tests.
  const access = { assertAllowed: async () => undefined };
  source.setOptions({
    poolSize: 1,
    extra: {
      ...source.options.extra,
      application_name: "hermes-connections-pool1-proof",
    },
  });
  await source.initialize();
  await gate.connect();
  const service = new HermesConnectionsService(
    source,
    access,
    encryption,
    new ConnectedAccountTokenEncryptionService(encryption),
  );
  const actor = {
    workspaceId: randomUUID(),
    userId: randomUUID(),
    userWorkspaceId: randomUUID(),
  };
  const other = {
    workspaceId: randomUUID(),
    userId: randomUUID(),
    userWorkspaceId: randomUUID(),
  };
  const settings = { allowedSources: ["FORMS"], maxRequestsPerMinute: 10 };
  const input = (expectedRevision, secret) => ({
    kind: "INTAKE",
    expectedRevision,
    settings,
    secrets: { secret },
  });
  const proofs = [];
  try {
    await gate.query("BEGIN");
    for (const { workspaceId } of [actor, other]) {
      const applicationId = randomUUID();
      await gate.query(
        'INSERT INTO "core"."workspace" ("id","displayName","activationStatus","subdomain","workspaceCustomApplicationId","inviteHash") VALUES ($1,$2,\'PENDING_CREATION\',$3,$4,$5)',
        [
          workspaceId,
          "Disposable connections CI",
          `connections-ci-${workspaceId}`,
          applicationId,
          randomUUID(),
        ],
      );
      await gate.query(
        'INSERT INTO "core"."application" ("id","workspaceId","universalIdentifier","name","sourcePath","version","sourceType","canBeUninstalled") VALUES ($1,$2,$1,$3,\'workspace-custom\',\'1.0.1\',\'local\',false)',
        [applicationId, workspaceId, "Disposable connection application"],
      );
    }
    await gate.query("COMMIT");
    const first = await service.save(actor, input(0, "a".repeat(64)));
    assert.equal(first.revision, 1);
    assert.equal(JSON.stringify(first).includes("a".repeat(64)), false);
    const row = await source
      .getRepository(HermesConnectionEntity)
      .findOneByOrFail({ workspaceId: actor.workspaceId, kind: "INTAKE" });
    assert.match(row.configuration, /^enc:v2:/);
    assert.throws(() =>
      encryption.decryptVersioned(row.configuration, {
        workspaceId: other.workspaceId,
      }),
    );
    proofs.push("native-encrypted-save-and-workspace-AAD");
    const outcomes = await Promise.allSettled([
      service.save(actor, input(1, "b".repeat(64))),
      service.save(actor, input(1, "c".repeat(64))),
    ]);
    assert.equal(
      outcomes.filter((item) => item.status === "fulfilled").length,
      1,
    );
    assert.equal(
      outcomes.filter((item) => item.status === "rejected").length,
      1,
    );
    const current = await service.resolve(actor.workspaceId, "INTAKE");
    assert.equal(current.revision, 2);
    proofs.push("real-PG-concurrent-CAS-single-winner-pool1");
    await assert.rejects(service.save(other, input(0, current.secrets.secret)));
    await gate.query(
      'UPDATE core."hermesConnection" SET "configuration"=$1 WHERE "workspaceId"=$2 AND "kind"=\'INTAKE\'',
      ["enc:v2:corrupt-peer", actor.workspaceId],
    );
    await service.save(other, input(0, "d".repeat(64)));
    proofs.push(
      "duplicate-secret-refused-and-unrelated-corrupt-peer-does-not-block",
    );
    // Repair only fixture data, restoring the exact original encrypted row.
    await gate.query(
      'UPDATE core."hermesConnection" SET "configuration"=$1,"revision"=1,"secretHash"=$2 WHERE "workspaceId"=$3 AND "kind"=\'INTAKE\'',
      [row.configuration, row.secretHash, actor.workspaceId],
    );
    const old = await service.resolve(actor.workspaceId, "INTAKE");
    // Revoke while a stale native workspace transaction is waiting for the very
    // same advisory lock. Driver sees only its own native query callback.
    await gate.query("BEGIN");
    await gate.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `hermes-messaging:${actor.workspaceId}`,
    ]);
    await gate.query(
      'UPDATE core."hermesConnection" SET "enabled"=false,"configuration"=NULL,"secretHash"=NULL,"revision"="revision"+1 WHERE "workspaceId"=$1',
      [actor.workspaceId],
    );
    let attempted;
    const waiting = new Promise((resolve) => {
      attempted = resolve;
    });
    const stale = source.transaction(async (manager) => {
      attempted();
      await service.assertRevisionViaQuery(
        actor.workspaceId,
        "INTAKE",
        old,
        (sql, values) => manager.query(sql, values),
      );
      await manager.query(
        'INSERT INTO core."hermesImportState" ("workspaceId","state") VALUES ($1,$2)',
        [actor.workspaceId, { version: 1, batches: [], campaignIds: [] }],
      );
    });
    // Attach rejection handling before releasing the barrier.
    const rejected = assert.rejects(stale, /CONNECTION_REVISION_CONFLICT/);
    await waiting;
    let lockWaitObserved = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const observed = await gate.query(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name='hermes-connections-pool1-proof' AND wait_event_type='Lock'",
      );
      if (observed.rows[0].n === 1) {
        lockWaitObserved = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      await gate.query("SELECT pg_stat_clear_snapshot()");
    }
    assert.equal(
      lockWaitObserved,
      true,
      "Real server-side advisory lock wait must be observed",
    );
    await gate.query("COMMIT");
    await rejected;
    assert.equal(
      (
        await gate.query(
          'SELECT count(*)::int AS n FROM core."hermesImportState" WHERE "workspaceId"=$1',
          [actor.workspaceId],
        )
      ).rows[0].n,
      0,
    );
    proofs.push(
      "stale-revision-after-advisory-lock-blocks-all-transaction-writes-pool1",
    );
    assert.equal(await service.resolve(actor.workspaceId, "INTAKE"), null);
    const rebound = await service.save(actor, input(2, "e".repeat(64)));
    assert.equal(rebound.revision, 3);
    assert.notEqual(rebound.connectionId, old.connectionId);
    await service.remove(actor, { kind: "INTAKE", expectedRevision: 3 });
    assert.equal(
      await service.resolveByConnectionId(rebound.connectionId, "INTAKE"),
      null,
    );
    proofs.push("tombstone-recreate-monotone-new-identity-and-old-id-rejected");
    const {
      proveIngressGuards,
    } = require("./check-hermes-connections-ingress-pg.cjs");
    proofs.push(
      ...(await proveIngressGuards({
        source,
        gate,
        service,
        actor,
        access,
        encryption,
        accountEncryption: new ConnectedAccountTokenEncryptionService(
          encryption,
        ),
      })),
    );
    await gate.query(
      'DELETE FROM core."workspace" WHERE "id"=ANY($1::uuid[])',
      [[actor.workspaceId, other.workspaceId]],
    );
    assert.equal(
      (
        await gate.query(
          'SELECT count(*)::int AS n FROM core."hermesConnection" WHERE "workspaceId"=ANY($1::uuid[])',
          [[actor.workspaceId, other.workspaceId]],
        )
      ).rows[0].n,
      0,
    );
    proofs.push("native-workspace-cascade-cleanup");
    console.log(
      "HERMES_CONNECTION_PG:" +
        JSON.stringify({
          status: "passed",
          poolSize: 1,
          assertions: proofs,
          authorization:
            "explicit allowed-actor fixture, native storage/CAS/locks only",
          providerTraffic: false,
        }),
    );
  } finally {
    await gate.query("ROLLBACK").catch(() => undefined);
    await source.destroy();
    await gate.end();
  }
})().catch((error) => {
  console.error(
    "Native connection PostgreSQL assertion failed: " +
      JSON.stringify({
        name: error?.name,
        code: error?.code,
        actual: typeof error?.actual === "number" ? error.actual : undefined,
        expected:
          typeof error?.expected === "number" ? error.expected : undefined,
        stack: error?.stack
          ?.split("\n")
          .filter((line) => line.trim().startsWith("at "))
          .slice(0, 4),
      }),
  );
  process.exitCode = 1;
});
