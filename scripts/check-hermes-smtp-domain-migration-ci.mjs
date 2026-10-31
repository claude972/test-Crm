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
const baselineRoot = path.join(root, ".smtp-domain-baseline");
const baseline = path.join(baselineRoot, serverRelative);
const baseSha = "90f180a5aed985be373fc577005a8a62ed04152e";
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

// Every statement is checked against the sole entity delta before execution.
export function validateSmtpDomainSql(up, down) {
  const expectedUp = [
    'ALTER TABLE "core"."emailingDomain" DROP CONSTRAINT "IDX_EMAILING_DOMAIN_DOMAIN_UNIQUE"',
    `CREATE TYPE "core"."emailingDomain_driver_enum" AS ENUM('LEGACY_GLOBAL', 'AWS_SES', 'RESEND', 'SMTP', 'LOG')`,
    `ALTER TABLE "core"."emailingDomain" ADD "driver" "core"."emailingDomain_driver_enum" NOT NULL DEFAULT 'LEGACY_GLOBAL'`,
    `CREATE UNIQUE INDEX "IDX_EMAILING_DOMAIN_GLOBAL_DOMAIN_UNIQUE" ON "core"."emailingDomain" ("domain") WHERE "driver" <> 'SMTP'`,
    'ALTER TABLE "core"."emailingDomain" ADD CONSTRAINT "IDX_EMAILING_DOMAIN_WORKSPACE_DRIVER_UNIQUE" UNIQUE ("workspaceId", "domain", "driver")',
  ];
  const expectedDown = [
    'ALTER TABLE "core"."emailingDomain" DROP CONSTRAINT "IDX_EMAILING_DOMAIN_WORKSPACE_DRIVER_UNIQUE"',
    'DROP INDEX "core"."IDX_EMAILING_DOMAIN_GLOBAL_DOMAIN_UNIQUE"',
    'ALTER TABLE "core"."emailingDomain" DROP COLUMN "driver"',
    'DROP TYPE "core"."emailingDomain_driver_enum"',
    'ALTER TABLE "core"."emailingDomain" ADD CONSTRAINT "IDX_EMAILING_DOMAIN_DOMAIN_UNIQUE" UNIQUE ("domain")',
  ];
  assert.deepEqual([...up].sort(), expectedUp.sort(), 'Only driver provenance and exact ownership indexes may be added');
  assert.deepEqual([...down].sort(), expectedDown.sort(), 'Rollback must restore global reservation without deleting rows');
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
  const artifactDirectory = path.join(
    root,
    "hermes-smtp-domain-migration-artifacts",
  );
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
    REDIS_CACHE_PREFIX: `smtp-domain-ci-${process.env.GITHUB_RUN_ID}`,
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
  const { Client } = requireFromServer("pg");
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
        name.endsWith("-scope-smtp-emailing-domains.ts"),
      );
    const generating = find().length === 0;
    const nativeCandidateUp = schemaDiff(server);
    const nativeCandidateDown = [
      ...report.nativeMetadataComparisons.at(-1).down,
    ].reverse();
    writeFileSync(
      path.join(artifactDirectory, "native-feature-diff-before-generator.json"),
      JSON.stringify(nativeCandidateUp, null, 2) + "\n",
    );
    if (generating)
      run([
        "dist/command/command.js",
        "generate:instance-command",
        "--name",
        "scope-smtp-emailing-domains",
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
    const className = "ScopeSmtpEmailingDomainsFastInstanceCommand";
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
    const loaded = generating
      ? loadSource(requireFromServer, migrationPath, {
          typeorm: requireFromServer("typeorm"),
          "src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator":
            { RegisteredInstanceCommand: () => (target) => target },
        })
      : requireFromServer(
          path.join(
            server,
            "dist/database/commands/upgrade-version-command/2-52",
            filename.replace(/\.ts$/, ".js"),
          ),
        );
    if (!generating) {
      const { getRegisteredInstanceCommandMetadata } = requireFromServer(
        path.join(
          server,
          "dist/engine/core-modules/upgrade/decorators/registered-instance-command.decorator.js",
        ),
      );
      assert.deepEqual(
        getRegisteredInstanceCommandMetadata(loaded[className]),
        { version: "2.52.0", timestamp: generatedTimestamp, type: "fast" },
      );
      report.committedCommand = {
        compiled: true,
        nativeRegistration: true,
        timestamp: generatedTimestamp,
      };
    }
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
    validateSmtpDomainSql(up, down);
    assert.deepEqual(
      up,
      nativeCandidateUp,
      "Committed/generated command up SQL must equal the fresh native metadata candidate",
    );
    assert.deepEqual(
      down,
      nativeCandidateDown,
      "Committed/generated command down SQL must equal the fresh native metadata candidate",
    );
    report.nativeCandidateMatchesCommand = true;
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
    await instance.up({
      query: (sql, parameters) => client.query(sql, parameters),
    });
    const featureDiff = schemaDiff(server);
    assert.deepEqual(
      featureDiff,
      [],
      "Feature metadata must exactly match generated SQL",
    );
    await instance.down({
      query: (sql, parameters) => client.query(sql, parameters),
    });
    assert.deepEqual(
      schemaDiff(baseline),
      [],
      "Down must restore the prepared baseline metadata fixture, including the already-applied media schema",
    );
    await instance.up({
      query: (sql, parameters) => client.query(sql, parameters),
    });
    assert.deepEqual(
      schemaDiff(server),
      [],
      "Re-up must converge with feature metadata",
    );
    // Roll back synthetic rows; a down with shared SMTP rows must fail atomically.
    await client.query('BEGIN');
    try {
      const workspaces = [randomUUID(), randomUUID()];
      for (const workspaceId of workspaces) {
        const applicationId = randomUUID();
        await client.query(`INSERT INTO "core"."workspace" ("id","displayName","activationStatus","subdomain","workspaceCustomApplicationId","inviteHash") VALUES ($1,$2,'PENDING_CREATION',$3,$4,$5)`,
          [workspaceId, 'Disposable SMTP domain fixture', `smtp-ci-${workspaceId}`, applicationId, randomUUID()]);
        await client.query(`INSERT INTO "core"."application" ("id","workspaceId","universalIdentifier","name","sourcePath","version","sourceType","canBeUninstalled") VALUES ($1,$2,$1,$3,'workspace-custom','1.0.1','local',false)`,
          [applicationId, workspaceId, 'Disposable SMTP application']);
      }
      const insert = (workspaceId, driver) => client.query(`INSERT INTO "core"."emailingDomain" ("domain","workspaceId","driver") VALUES ('shared.test',$1,$2)`, [workspaceId, driver]);
      await insert(workspaces[0], 'SMTP');
      await insert(workspaces[1], 'SMTP');
      await insert(workspaces[0], 'AWS_SES');
      const refuse = async (operation) => {
        await client.query('SAVEPOINT ownership_refusal');
        await assert.rejects(operation, (error) => error.code === '23505');
        await client.query('ROLLBACK TO SAVEPOINT ownership_refusal');
        await client.query('RELEASE SAVEPOINT ownership_refusal');
      };
      await refuse(() => insert(workspaces[0], 'SMTP'));
      await refuse(() => insert(workspaces[1], 'AWS_SES'));
      await refuse(() => insert(workspaces[1], 'RESEND'));
      await client.query('SAVEPOINT rollback_refusal');
      await assert.rejects(() => instance.down({ query: (sql, parameters) => client.query(sql, parameters) }),
        (error) => error.code === '23505');
      await client.query('ROLLBACK TO SAVEPOINT rollback_refusal');
      const preserved = await client.query(`SELECT "driver" FROM "core"."emailingDomain" WHERE "domain"='shared.test' ORDER BY "driver"`);
      assert.deepEqual(preserved.rows.map(row => row.driver).sort(), ['AWS_SES', 'SMTP', 'SMTP'].sort());
      report.postgresOwnership = {
        smtpTwoWorkspaces: true, duplicateSmtpRefused: true,
        globalCloudReservationPreserved: true, unsafeDownRefusedWithoutRowLoss: true,
      };
    } finally {
      await client.query('ROLLBACK');
    }
    assert.deepEqual(schemaDiff(server), [], 'Synthetic constraint tests must leave feature schema unchanged');
    report.status = "passed";
    report.migration = relativeMigration;
    report.roundTrip =
      "native official generator, prepared baseline metadata fixture → up → feature metadata → down → prepared baseline metadata fixture → up → feature metadata; the raw canonical diagnostic and native cursor/default proof are reported separately";
    console.info(
      "SMTP domain provenance: official migration and exact PostgreSQL metadata round-trip passed",
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
