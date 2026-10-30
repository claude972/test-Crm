import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertDisposableTarget,
  loadSource,
} from "./check-hermes-migration-ci.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverRelative = "apps/crm/ui/packages/twenty-server";
const server = path.join(root, serverRelative);
const baselineRoot = path.join(root, ".media-baseline");
const baseline = path.join(baselineRoot, serverRelative);
const baseSha = "baece3a46a6286a933cfc99b22a53ac50c34e498";
const versionDirectory = path.join(
  server,
  "src/database/commands/upgrade-version-command/2-52",
);
const manifestPath = path.join(
  server,
  "src/database/commands/upgrade-version-command/instance-commands.constant.ts",
);

// Raw canonical metadata includes seven deliberately removed legacy columns.
// This diagnostic must never be applied as a baseline schema repair.
export const BASELINE_FIXTURE_DRIFT = Object.freeze([
  `ALTER TABLE "core"."agent" ADD "evaluationInputs" text array NOT NULL DEFAULT '{}'`,
  'ALTER TABLE "core"."rolePermissionFlag" ADD "flag" character varying NOT NULL',
  'ALTER TABLE "core"."fieldMetadata" ADD "standardOverrides" jsonb',
  'ALTER TABLE "core"."fieldMetadata" ADD "isCustom" boolean NOT NULL DEFAULT false',
  'ALTER TABLE "core"."objectMetadata" ADD "standardOverrides" jsonb',
  'ALTER TABLE "core"."objectMetadata" ADD "isCustom" boolean NOT NULL DEFAULT false',
  'ALTER TABLE "core"."timelineActivityType" ADD "renderer" character varying',
  `ALTER TABLE "core"."hermesImportState" ALTER COLUMN "state" SET DEFAULT '{"version":1,"batches":[],"campaignIds":[]}'::jsonb`,
]);

export function validateBaselineFixtureDrift(queries) {
  assert.ok(Array.isArray(queries));
  assert.deepEqual(
    [...queries].sort(),
    [...BASELINE_FIXTURE_DRIFT].sort(),
    "Unexpected raw canonical diagnostic at the pinned baseline",
  );
}

export const IMPORT_STATE_DEFAULT = Object.freeze({
  version: 1,
  batches: [],
  campaignIds: [],
});
export const IMPORT_STATE_DEFAULT_SQL =
  "'" + JSON.stringify(IMPORT_STATE_DEFAULT) + "'::jsonb";

export function parseImportStateCatalogDefault(expression) {
  assert.equal(typeof expression, "string");
  assert.match(
    expression,
    /^'[^']*'::jsonb$/,
    "Only a literal native JSONB default may be normalized",
  );
  const value = JSON.parse(expression.slice(1, -8));
  assert.deepEqual(
    value,
    IMPORT_STATE_DEFAULT,
    "The physical default must strictly equal the expected state object",
  );
  return value;
}

export function validateImportStateMetadataDefault(value) {
  assert.equal(value?.kind, "function");
  assert.equal(typeof value.source, "string");
  assert.ok(value.source.length > 0);
  assert.equal(
    value.sql,
    IMPORT_STATE_DEFAULT_SQL,
    "Only the exact historical function default may be normalized",
  );
}

// The generator must never smuggle unrelated schema changes into this patch.
export function validateMediaSql(up, down) {
  assert.ok(Array.isArray(up) && Array.isArray(down));
  assert.equal(
    up.filter((sql) => /^CREATE TABLE "core"\."hermesMediaAsset" /.test(sql))
      .length,
    1,
  );
  assert.equal(
    up.filter((sql) =>
      /^ALTER TABLE "core"\."hermesInboxMessage" ADD "kind" character varying\(16\) NOT NULL DEFAULT 'TEXT'$/.test(
        sql,
      ),
    ).length,
    1,
  );
  assert.equal(
    up.filter((sql) =>
      /^ALTER TABLE "core"\."hermesInboxMessage" ADD "attachmentIds" uuid array NOT NULL DEFAULT '{}'$/.test(
        sql,
      ),
    ).length,
    1,
  );
  assert.equal(
    up.filter((sql) =>
      /FOREIGN KEY \("workspaceId"\) REFERENCES "core"\."workspace"\("id"\)/.test(
        sql,
      ),
    ).length,
    1,
  );
  assert.equal(
    up.filter((sql) =>
      /FOREIGN KEY \("fileId"\) REFERENCES "core"\."file"\("id"\)/.test(sql),
    ).length,
    1,
  );
  assert.equal(
    up.filter((sql) =>
      /^CREATE (UNIQUE )?INDEX "IDX_HERMES_MEDIA_(SCOPE|FILE)" /.test(sql),
    ).length,
    2,
  );
  assert.equal(up.length, 7);
  assert.equal(down.length, 7);
  for (const sql of [...up, ...down]) {
    assert.equal(typeof sql, "string");
    assert.ok(!/[;]|--|\/\*/.test(sql));
    assert.ok(
      !/\b(TRUNCATE|GRANT|REVOKE|INSERT|UPDATE|DELETE)\b/i.test(
        sql.replace(/ON DELETE CASCADE ON UPDATE NO ACTION/g, ""),
      ),
    );
    assert.ok(
      /^(CREATE TABLE "core"\."hermesMediaAsset" |CREATE (UNIQUE )?INDEX "IDX_HERMES_MEDIA_(SCOPE|FILE)" ON "core"\."hermesMediaAsset" |ALTER TABLE "core"\."hermesMediaAsset" (ADD|DROP) CONSTRAINT |ALTER TABLE "core"\."hermesInboxMessage" (ADD|DROP COLUMN) "(kind|attachmentIds)"|DROP INDEX "core"\."IDX_HERMES_MEDIA_(SCOPE|FILE)"|DROP TABLE "core"\."hermesMediaAsset")/.test(
        sql,
      ),
      "Only the media table, its indexes/FKs and two message columns may change",
    );
  }
}

async function postgresAssertions(client, Pool, url) {
  const workspaceId = randomUUID(),
    otherWorkspaceId = randomUUID();
  const conversationId = randomUUID(),
    assetId = randomUUID(),
    fileId = randomUUID(),
    applicationId = randomUUID();
  const requestId = randomUUID();
  const pool = new Pool({
    connectionString: url,
    max: 8,
    statement_timeout: 10_000,
  });
  try {
    await client.query("BEGIN");
    for (const id of [workspaceId, otherWorkspaceId]) {
      await client.query(
        'INSERT INTO "core"."workspace" ("id","displayName","activationStatus","subdomain","workspaceCustomApplicationId","inviteHash") VALUES ($1,$2,\'PENDING_CREATION\',$3,$4,$5)',
        [
          id,
          "Disposable media CI",
          `media-ci-${id}`,
          id === workspaceId ? applicationId : randomUUID(),
          randomUUID(),
        ],
      );
    }
    await client.query(
      'INSERT INTO "core"."application" ("id","workspaceId","universalIdentifier","name","sourcePath","version","sourceType","canBeUninstalled") VALUES ($1,$2,$1,$3,\'workspace-custom\',\'1.0.1\',\'local\',false)',
      [applicationId, workspaceId, "Disposable media application"],
    );
    await client.query(
      'INSERT INTO "core"."file" ("id","workspaceId","applicationId","path","size","mimeType") VALUES ($1,$2,$3,$4,16,\'image/png\')',
      [fileId, workspaceId, applicationId, `agent-chat/${fileId}.png`],
    );
    await client.query(
      'INSERT INTO "core"."hermesConversation" ("id","workspaceId","channel","providerConnectionId","providerConversationId","contactHandle","lastMessageAt") VALUES ($1,$2,\'WHATSAPP\',\'fixture-media\',\'fixture-thread\',\'33612345678@s.whatsapp.net\',now())',
      [conversationId, workspaceId],
    );
    await client.query(
      'INSERT INTO "core"."hermesInboxMessage" ("id","workspaceId","conversationId","channel","providerConnectionId","clientRequestId","direction","status","text","contentDigest","occurredAt") VALUES ($1,$2,$3,\'WHATSAPP\',\'fixture-media\',$4,\'OUTBOUND\',\'UNCONFIRMED\',\'fixture\',$5,now())',
      [requestId, workspaceId, conversationId, randomUUID(), "a".repeat(64)],
    );
    assert.equal(
      (
        await client.query(
          'SELECT "kind","attachmentIds" FROM "core"."hermesInboxMessage" WHERE "id"=$1',
          [requestId],
        )
      ).rows[0].kind,
      "TEXT",
    );
    await client.query(
      'INSERT INTO "core"."hermesMediaAsset" ("id","workspaceId","conversationId","providerConnectionId","fileId","kind","filename","mimeType","size","status","expiresAt","contentSha256") VALUES ($1,$2,$3,\'fixture-media\',$4,\'IMAGE\',\'fixture.png\',\'image/png\',16,\'READY\',now()+interval \'1 minute\',$5)',
      [assetId, workspaceId, conversationId, fileId, "a".repeat(64)],
    );
    await client.query("COMMIT");
    assert.equal(
      (
        await client.query(
          'SELECT "id" FROM "core"."hermesMediaAsset" WHERE "id"=$1 AND "workspaceId"=$2',
          [assetId, otherWorkspaceId],
        )
      ).rowCount,
      0,
    );
    const reservations = await Promise.all(
      Array.from({ length: 8 }, () =>
        pool.query(
          'UPDATE "core"."hermesMediaAsset" SET "status"=\'ATTACHED\',"messageId"=$1 WHERE "id"=$2 AND "workspaceId"=$3 AND "conversationId"=$4 AND "providerConnectionId"=\'fixture-media\' AND "status"=\'READY\' RETURNING "id"',
          [requestId, assetId, workspaceId, conversationId],
        ),
      ),
    );
    assert.equal(
      reservations.reduce((sum, result) => sum + result.rowCount, 0),
      1,
      "Only one concurrent reservation may consume an asset",
    );
    assert.equal(
      (
        await client.query(
          'UPDATE "core"."hermesMediaAsset" SET "status"=\'REVOKED\' WHERE "id"=$1 AND "workspaceId"=$2 AND "status" IN (\'PENDING\',\'READY\')',
          [assetId, workspaceId],
        )
      ).rowCount,
      0,
      "A sent asset cannot be cancelled as a draft",
    );
    await client.query('DELETE FROM "core"."workspace" WHERE "id"=$1', [
      workspaceId,
    ]);
    assert.equal(
      (
        await client.query(
          'SELECT "id" FROM "core"."hermesMediaAsset" WHERE "workspaceId"=$1',
          [workspaceId],
        )
      ).rowCount,
      0,
      "Native workspace cascade removes assets",
    );
    return {
      concurrentAssetReservation: "one winner / eight real PG connections",
      scopedAssetLookup: "foreign workspace returns zero rows",
      legacyMessageDefault: "TEXT",
      workspaceCascade: "passed",
    };
  } finally {
    await client.query("ROLLBACK");
    await client.query(
      'DELETE FROM "core"."workspace" WHERE "id" = ANY($1::uuid[])',
      [[workspaceId, otherWorkspaceId]],
    );
    await pool.end();
  }
}

export async function main() {
  assert.equal(
    process.argv.length,
    2,
    "This guarded script accepts no arguments",
  );
  const database = assertDisposableTarget(process.env, root);
  const sha = spawnSync("git", ["-C", baselineRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  assert.equal(sha.status, 0);
  assert.equal(sha.stdout.trim(), baseSha);
  for (const checkout of [root, baselineRoot]) {
    for (const directory of [
      checkout,
      path.join(checkout, "apps/crm/ui"),
      path.join(checkout, serverRelative),
    ]) {
      const files = readdirSync(directory).filter(
        (name) =>
          (name === ".env" || name.startsWith(".env.")) &&
          !name.endsWith(".example") &&
          !name.endsWith(".sample"),
      );
      assert.deepEqual(
        files,
        [],
        "No private environment may be loaded by the CI fixture",
      );
    }
  }
  const artifactDirectory = path.join(root, "hermes-media-migration-artifacts");
  mkdirSync(artifactDirectory, { recursive: true });
  const report = {
    status: "running",
    base: baseSha,
    feature: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    version: "2.52.0",
  };
  const save = () =>
    writeFileSync(
      path.join(artifactDirectory, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  save();
  const secret = randomBytes(32).toString("hex");
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_OPTIONS: "--max-old-space-size=4096",
    NODE_ENV: "production",
    CI: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    PG_DATABASE_URL: database.href,
    REDIS_URL: process.env.REDIS_URL,
    APP_SECRET: secret,
    SERVER_URL: "http://127.0.0.1:3000",
    FRONTEND_URL: "http://127.0.0.1:3001",
    IS_BILLING_ENABLED: "false",
    IS_FDW_ENABLED: "false",
    IS_CONFIG_VARIABLES_IN_DB_ENABLED: "false",
    TELEMETRY_ENABLED: "false",
    EMAIL_DRIVER: "logger",
    LOGGER_IS_BUFFER_ENABLED: "false",
    REDIS_CACHE_PREFIX: `media-ci-${process.env.GITHUB_RUN_ID}`,
  };
  const redact = (value) =>
    String(value)
      .replaceAll(secret, "[redacted]")
      .replaceAll(database.href, "[disposable-db]")
      .replaceAll(database.password, "[redacted]");
  let fixtureNormalizerPath;
  const run = (args, cwd = server) => {
    const result = spawnSync(
      process.execPath,
      [
        ...(fixtureNormalizerPath ? ["--require", fixtureNormalizerPath] : []),
        ...args,
      ],
      {
        cwd,
        env,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    if (result.error || result.status !== 0)
      throw new Error(
        redact(
          `${args[0]} failed\n${result.error ?? ""}\n${result.stdout}\n${result.stderr}`,
        ).slice(-16000),
      );
    return result.stdout;
  };
  const canonicalSchemaDiff = (cwd) => {
    const output = run(
      [
        "-e",
        `const { connectionSource } = require('./dist/database/typeorm/core/core.datasource.js'); (async () => { await connectionSource.initialize(); try { const sql = await connectionSource.driver.createSchemaBuilder().log(); console.log('HERMES_SCHEMA_DIFF:' + JSON.stringify(sql.upQueries.map(({query}) => query))); } finally { await connectionSource.destroy(); } })().catch(() => { console.error('Schema comparison failed'); process.exitCode = 1; });`,
      ],
      cwd,
    );
    const line = output
      .split("\n")
      .find((entry) => entry.startsWith("HERMES_SCHEMA_DIFF:"));
    assert.ok(line, "Missing metadata comparison");
    return JSON.parse(line.slice("HERMES_SCHEMA_DIFF:".length));
  };
  const schemaDiff = (cwd) => {
    const output = run(
      [
        "-e",
        `const {CommandFactory}=require('nest-commander');const {DataSource}=require('typeorm');const {CommandModule}=require('./dist/command/command.module.js');const {UpgradeMigrationService}=require('./dist/engine/core-modules/upgrade/services/upgrade-migration.service.js');const {MetadataEventEmitter}=require('./dist/engine/subscriptions/metadata-event/metadata-event-emitter.js');(async()=>{const app=await CommandFactory.createWithoutRunning(CommandModule,{logger:['error'],bufferLogs:false});try{const source=app.get(DataSource);const sql=await source.driver.createSchemaBuilder().log();const cursor=await app.get(UpgradeMigrationService).getLastAttemptedInstanceCommand();console.log('HERMES_NATIVE_SCHEMA:'+JSON.stringify({up:sql.upQueries.map(({query})=>query),down:sql.downQueries.map(({query})=>query),cursor:cursor?{name:cursor.name,status:cursor.status,executedByVersion:cursor.executedByVersion}:null,columns:source.entityMetadatas.filter(item=>['agent','rolePermissionFlag','fieldMetadata','objectMetadata','timelineActivityType','hermesImportState'].includes(item.tableName)).map(item=>({table:item.tablePath,columns:item.columns.map(column=>column.databaseName).sort()}))}));}finally{await app.get(MetadataEventEmitter).drain();await app.close();}})().catch(error=>{console.error(error instanceof Error?error.message:'Native metadata comparison failed');process.exitCode=1;});`,
      ],
      cwd,
    );
    const line = output
      .split("\n")
      .find((entry) => entry.startsWith("HERMES_NATIVE_SCHEMA:"));
    assert.ok(line, "Missing upgrade-aware native metadata comparison");
    const comparison = JSON.parse(line.slice("HERMES_NATIVE_SCHEMA:".length));
    report.nativeMetadataComparisons ??= [];
    report.nativeMetadataComparisons.push({
      checkout: cwd === baseline ? "baseline" : "feature",
      ...comparison,
    });
    save();
    return comparison.up;
  };
  const requireFromServer = createRequire(path.join(server, "package.json"));
  const { Client, Pool } = requireFromServer("pg");
  const client = new Client({
    connectionString: database.href,
    statement_timeout: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='core'",
        )
      ).rows[0].n,
      0,
      "Fresh GitHub-hosted PG service required",
    );
    run(["dist/database/scripts/setup-db.js"], baseline);
    run(
      [
        "dist/command/command.js",
        "run-instance-commands",
        "--force",
        "--include-slow",
      ],
      baseline,
    );
    const canonicalDiagnostic = canonicalSchemaDiff(baseline);
    validateBaselineFixtureDrift(canonicalDiagnostic);
    writeFileSync(
      path.join(artifactDirectory, "raw-canonical-metadata-diagnostic.json"),
      JSON.stringify(
        {
          base: baseSha,
          diagnosticOnly: true,
          interpretation:
            "Seven columns are deliberately removed by native upgrade-aware metadata at the applied cursor; bare DataSource must not reintroduce them. The remaining JSONB literal formatting difference is checked semantically.",
          queries: canonicalDiagnostic,
        },
        null,
        2,
      ) + "\n",
    );
    report.rawCanonicalMetadataDiagnostic = {
      count: canonicalDiagnostic.length,
      evidence: "raw-canonical-metadata-diagnostic.json",
      schemaSynchronizationApplied: false,
    };
    const historicalBaselineDrift = schemaDiff(baseline);
    if (historicalBaselineDrift.length)
      assert.deepEqual(
        historicalBaselineDrift,
        [BASELINE_FIXTURE_DRIFT[7]],
        "Only the exact semantic JSONB default difference may remain in the native baseline context",
      );
    writeFileSync(
      path.join(artifactDirectory, "historical-baseline-drift.json"),
      JSON.stringify(
        {
          base: baseSha,
          comparison:
            "Native CommandModule context, with UpgradeAwareEntityMetadataAdapter at the applied cursor",
          queries: historicalBaselineDrift,
        },
        null,
        2,
      ) + "\n",
    );
    report.historicalBaselineMigrationConvergence = {
      status: historicalBaselineDrift.length
        ? "semantic-default-proof-required"
        : "passed",
      count: historicalBaselineDrift.length,
      evidence: "historical-baseline-drift.json",
    };
    save();
    const residualBaselineDrift = historicalBaselineDrift;
    writeFileSync(
      path.join(artifactDirectory, "baseline-native-before-normalization.json"),
      JSON.stringify(residualBaselineDrift, null, 2) + "\n",
    );
    if (residualBaselineDrift.length) {
      assert.deepEqual(
        residualBaselineDrift,
        [BASELINE_FIXTURE_DRIFT[7]],
        "Do not normalize an unrelated or additional residual delta",
      );
      const catalog = await client.query(
        `SELECT pg_get_expr(d.adbin,d.adrelid) AS expression FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum JOIN pg_class t ON t.oid=d.adrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='core' AND t.relname='hermesImportState' AND a.attname='state'`,
      );
      assert.equal(catalog.rowCount, 1);
      const physicalDefault = catalog.rows[0].expression;
      const actualValue = parseImportStateCatalogDefault(physicalDefault);
      const proof = await client.query(
        "SELECT $1::jsonb = $2::jsonb AS equivalent, $1::jsonb AS canonical",
        [JSON.stringify(actualValue), JSON.stringify(IMPORT_STATE_DEFAULT)],
      );
      assert.equal(proof.rows[0].equivalent, true);
      assert.deepEqual(proof.rows[0].canonical, IMPORT_STATE_DEFAULT);
      const inspectDefault = (cwd) => {
        const output = run(
          [
            "-e",
            `const {connectionSource}=require('./dist/database/typeorm/core/core.datasource.js'); (async()=>{await connectionSource.initialize();try{const entity=connectionSource.entityMetadatas.find(item=>item.tablePath==='core.hermesImportState');const column=entity?.columns.find(item=>item.databaseName==='state');if(!column||column.type!=='jsonb'||typeof column.default!=='function')throw Error('Unexpected import-state metadata');console.log('HERMES_DEFAULT:'+JSON.stringify({kind:typeof column.default,source:column.default.toString(),sql:column.default()}));}finally{await connectionSource.destroy();}})().catch(()=>{console.error('Default metadata inspection failed');process.exitCode=1;});`,
          ],
          cwd,
        );
        const line = output
          .split("\n")
          .find((line) => line.startsWith("HERMES_DEFAULT:"));
        assert.ok(line);
        const value = JSON.parse(line.slice("HERMES_DEFAULT:".length));
        validateImportStateMetadataDefault(value);
        return value;
      };
      const baselineDefault = inspectDefault(baseline),
        featureDefault = inspectDefault(server);
      assert.deepEqual(
        featureDefault,
        baselineDefault,
        "Baseline and feature must contain the exact same default function before fixture normalization",
      );
      fixtureNormalizerPath = path.join(
        artifactDirectory,
        "import-state-fixture-normalizer.cjs",
      );
      writeFileSync(
        fixtureNormalizerPath,
        `const assert=require('node:assert/strict');const {DataSource}=require(${JSON.stringify(requireFromServer.resolve("typeorm"))});const expected=${JSON.stringify(baselineDefault)};const canonical=${JSON.stringify(IMPORT_STATE_DEFAULT)};const initialize=DataSource.prototype.initialize;DataSource.prototype.initialize=async function(...args){const source=await initialize.apply(this,args);const entity=source.entityMetadatas.find(item=>item.tablePath==='core.hermesImportState');if(entity){const column=entity.columns.find(item=>item.databaseName==='state');assert.equal(column?.type,'jsonb');assert.equal(typeof column.default,'function');assert.equal(column.default.toString(),expected.source);assert.equal(column.default(),expected.sql);column.default=JSON.parse(JSON.stringify(canonical));}return source;};\n`,
      );
      report.fixtureDefaultNormalization = {
        scope: "only in-memory TypeORM metadata in fresh fixture subprocesses",
        reason:
          "PostgreSQL JSONB key ordering versus a function-valued literal default; native TypeORM object-default semantic comparison",
        originalSql: BASELINE_FIXTURE_DRIFT[7],
        physicalDefault,
        canonicalValue: proof.rows[0].canonical,
        baselineMetadata: baselineDefault,
        featureMetadata: featureDefault,
        postgresSemanticEquality: true,
      };
      writeFileSync(
        path.join(artifactDirectory, "import-state-default-proof.json"),
        JSON.stringify(report.fixtureDefaultNormalization, null, 2) + "\n",
      );
      save();
    }
    assert.deepEqual(
      schemaDiff(baseline),
      [],
      "The disposable baseline metadata fixture must converge before feature generation",
    );
    report.fixturePreparation =
      "Exact baseline migrations and the native CommandModule upgrade-aware cursor projection; NO schema synchronization and NO reintroduction of removed columns. Only the proven JSONB default representation is normalized in memory.";
    report.historicalBaselineMigrationConvergence.status =
      "passed with native cursor and validated semantic default";
    report.stage = "baseline-metadata-fixture-created";
    save();
    const beforeManifest = readFileSync(manifestPath, "utf8");
    const find = () =>
      readdirSync(versionDirectory).filter((name) =>
        name.endsWith("-add-hermes-media.ts"),
      );
    const generating = find().length === 0;
    writeFileSync(
      path.join(artifactDirectory, "native-feature-diff-before-generator.json"),
      JSON.stringify(schemaDiff(server), null, 2) + "\n",
    );
    if (generating)
      run([
        "dist/command/command.js",
        "generate:instance-command",
        "--name",
        "add-hermes-media",
        "--type",
        "fast",
        "--version",
        "2.52.0",
      ]);
    assert.equal(find().length, 1);
    const filename = find()[0],
      migrationPath = path.join(versionDirectory, filename),
      source = readFileSync(migrationPath, "utf8"),
      manifest = readFileSync(manifestPath, "utf8");
    const generatedTimestamp = Number(filename.match(/-fast-(\d+)-/)?.[1]);
    const priorTimestamps = readdirSync(versionDirectory)
      .filter((name) => name !== filename)
      .map((name) => Number(name.match(/-(?:fast|slow)-(\d+)-/)?.[1]))
      .filter(Number.isFinite);
    assert.ok(
      Number.isSafeInteger(generatedTimestamp) &&
        generatedTimestamp > Math.max(0, ...priorTimestamps),
      "The native command timestamp must exceed every existing current-version instance command",
    );
    const className = "AddHermesMediaFastInstanceCommand";
    assert.ok(
      manifest.includes(`import { ${className} }`) &&
        manifest.includes(`  ${className},`),
    );
    if (generating)
      assert.equal(
        manifest
          .replace(
            `import { ${className} } from 'src/database/commands/upgrade-version-command/2-52/${filename.slice(0, -3)}';\n`,
            "",
          )
          .replace(`  ${className},\n`, ""),
        beforeManifest,
        "Only native generator registration is permitted",
      );
    const loaded = loadSource(requireFromServer, migrationPath, {
      typeorm: requireFromServer("typeorm"),
      "src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator":
        { RegisteredInstanceCommand: () => (target) => target },
    });
    const instance = new loaded[className](),
      up = [],
      down = [];
    await instance.up({
      query: async (sql, parameters) => {
        assert.ok(!parameters?.length);
        up.push(sql);
      },
    });
    await instance.down({
      query: async (sql, parameters) => {
        assert.ok(!parameters?.length);
        down.push(sql);
      },
    });
    writeFileSync(
      path.join(artifactDirectory, "candidate-sql.unvalidated.json"),
      JSON.stringify({ up, down }, null, 2) + "\n",
    );
    writeFileSync(
      path.join(artifactDirectory, "candidate-command.unvalidated.txt"),
      source,
    );
    validateMediaSql(up, down);
    const relativeMigration = path.relative(root, migrationPath),
      relativeManifest = path.relative(root, manifestPath);
    for (const relative of [relativeMigration, relativeManifest]) {
      const destination = path.join(artifactDirectory, relative);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, readFileSync(path.join(root, relative)));
    }
    writeFileSync(
      path.join(artifactDirectory, "generated-sql.json"),
      JSON.stringify({ up, down }, null, 2) + "\n",
    );
    if (generating) {
      const git = (args, statuses) => {
        const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
        assert.ok(statuses.includes(result.status));
        return result.stdout;
      };
      writeFileSync(
        path.join(artifactDirectory, "migration.patch"),
        git(["diff", "--", relativeManifest], [0]) +
          git(
            ["diff", "--no-index", "--", "/dev/null", relativeMigration],
            [1],
          ),
      );
    }
    for (const sql of up) await client.query(sql);
    const featureDiff = schemaDiff(server);
    assert.deepEqual(
      featureDiff,
      [],
      "Feature metadata must exactly match generated SQL",
    );
    report.postgres = await postgresAssertions(client, Pool, database.href);
    for (const sql of down) await client.query(sql);
    assert.equal(
      (
        await client.query(
          "SELECT to_regclass('core.\"hermesMediaAsset\"') AS name",
        )
      ).rows[0].name,
      null,
    );
    assert.deepEqual(
      schemaDiff(baseline),
      [],
      "Down must restore the prepared baseline metadata fixture, including old message columns",
    );
    for (const sql of up) await client.query(sql);
    assert.deepEqual(
      schemaDiff(server),
      [],
      "Re-up must converge with feature metadata",
    );
    report.status = "passed";
    report.migration = relativeMigration;
    report.roundTrip =
      "native official generator, prepared baseline metadata fixture → up → feature metadata → down → prepared baseline metadata fixture → up → feature metadata; the raw canonical diagnostic and native cursor/default proof are reported separately";
    console.info(
      "Hermes media: official migration, PostgreSQL reservations and exact metadata round-trip passed",
    );
  } catch (error) {
    report.status = "failed";
    report.error = redact(error instanceof Error ? error.message : error);
    throw new Error(report.error);
  } finally {
    save();
    await client.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
