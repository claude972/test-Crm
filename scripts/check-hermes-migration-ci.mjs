import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = path.join(root, 'apps/crm/ui/packages/twenty-server');
const commandDirectory = 'src/database/commands/upgrade-version-command';
const migrationName = 'add-hermes-import-state';
const table = '"core"."hermesImportState"';

export function assertDisposableTarget(env, checkoutRoot = root) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'GitHub Actions only');
  assert.equal(
    env.RUNNER_ENVIRONMENT,
    'github-hosted',
    'GitHub-hosted disposable runner only',
  );
  assert.match(env.GITHUB_RUN_ID ?? '', /^\d+$/);
  assert.equal(
    path.resolve(env.GITHUB_WORKSPACE ?? ''),
    checkoutRoot,
    'Use the checked-out repository only',
  );
  const database = new URL(env.PG_DATABASE_URL);
  assert.equal(database.protocol, 'postgres:');
  assert.equal(database.hostname, '127.0.0.1');
  assert.equal(database.port, '5432');
  assert.equal(database.pathname, '/p0_ci');
  assert.equal(database.username, 'postgres');
  assert.ok(
    decodeURIComponent(database.password) === env.GITHUB_RUN_ID,
    'Use the disposable run ID password, never a preview/production credential',
  );
  assert.equal(database.search, '');
  assert.equal(database.hash, '');
  const redis = new URL(env.REDIS_URL);
  assert.ok(
    redis.href === 'redis://127.0.0.1:6379',
    'Only credential-free disposable Redis is allowed',
  );
  return database;
}

export function validateMigrationSql(up, down) {
  assert.equal(
    up.length,
    2,
    'Expected only Hermes CREATE TABLE and workspace FK',
  );
  assert.equal(down.length, 2, 'Expected reversible Hermes FK/table removal');
  assert.match(up[0], /^CREATE TABLE "core"\."hermesImportState" \([\s\S]+\)$/);
  assert.match(up[0], /"workspaceId" uuid NOT NULL/);
  assert.match(up[0], /"state" jsonb NOT NULL DEFAULT/);
  assert.match(up[0], /PRIMARY KEY \("workspaceId"\)/);
  assert.match(
    up[1],
    /^ALTER TABLE "core"\."hermesImportState" ADD CONSTRAINT "[A-Za-z0-9_]+" FOREIGN KEY \("workspaceId"\) REFERENCES "core"\."workspace"\("id"\) ON DELETE CASCADE ON UPDATE NO ACTION$/,
  );
  assert.match(
    down[0],
    /^ALTER TABLE "core"\."hermesImportState" DROP CONSTRAINT "[A-Za-z0-9_]+"$/,
  );
  assert.equal(down[1], `DROP TABLE ${table}`);
  for (const query of [...up, ...down]) {
    assert.equal(
      query.includes(';'),
      false,
      'One SQL statement per generated query',
    );
    const targets = [...query.matchAll(/"core"\."([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.ok(
      targets.every((name) =>
        ['hermesImportState', 'workspace'].includes(name),
      ),
    );
  }
}

function loadSource(requireFromServer, filename, imports) {
  const swc = requireFromServer('@swc/core');
  const source = readFileSync(filename, 'utf8');
  const { code } = swc.transformSync(source, {
    filename,
    jsc: {
      target: 'es2022',
      parser: { syntax: 'typescript', decorators: true },
      transform: { decoratorMetadata: true },
    },
    module: { type: 'commonjs' },
  });
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      Buffer,
      URL,
      require: (name) => {
        assert.ok(
          Object.hasOwn(imports, name),
          `Unexpected migration/fixture import: ${name}`,
        );
        return imports[name];
      },
    },
    { filename, timeout: 10_000 },
  );
  return module.exports;
}

async function checkImportTransactions(requireFromServer, database) {
  const orm = requireFromServer('typeorm');
  const nest = requireFromServer('@nestjs/common');
  const nestOrm = requireFromServer('@nestjs/typeorm');
  // Minimal relation metadata points at the real migrated workspace table;
  // synchronize remains false and production entity/service source is loaded unchanged.
  class WorkspaceFixture {}
  orm.Entity({ name: 'workspace', schema: 'core' })(WorkspaceFixture);
  orm.PrimaryColumn('uuid')(WorkspaceFixture.prototype, 'id');
  const production = 'src/engine/core-modules/hermes-prospection';
  const { HermesImportStateEntity } = loadSource(
    requireFromServer,
    path.join(server, production, 'entities/hermes-import-state.entity.ts'),
    {
      typeorm: orm,
      'src/engine/core-modules/workspace/workspace.entity': {
        WorkspaceEntity: WorkspaceFixture,
      },
    },
  );
  const policy = loadSource(
    requireFromServer,
    path.join(server, production, 'utils/hermes-import-policy.ts'),
    { 'node:crypto': requireFromServer('node:crypto') },
  );
  const { HermesImportStateService } = loadSource(
    requireFromServer,
    path.join(server, production, 'hermes-import-state.service.ts'),
    {
      '@nestjs/common': nest,
      '@nestjs/typeorm': nestOrm,
      typeorm: orm,
      'src/engine/core-modules/hermes-prospection/entities/hermes-import-state.entity':
        { HermesImportStateEntity },
      'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service':
        { HermesProspectionAccessService: class {} },
      'src/engine/core-modules/hermes-prospection/utils/hermes-import-policy':
        policy,
    },
  );
  const dataSource = new orm.DataSource({
    type: 'postgres',
    url: database.href,
    entities: [WorkspaceFixture, HermesImportStateEntity],
    synchronize: false,
    logging: false,
    poolSize: 16,
  });
  await dataSource.initialize();
  const workspaceA = randomUUID();
  const workspaceB = randomUUID();
  const actor = {
    workspaceId: workspaceA,
    userId: randomUUID(),
    userWorkspaceId: randomUUID(),
  };
  const otherActor = { ...actor, workspaceId: workspaceB };
  let allowed = true;
  const service = new HermesImportStateService(
    dataSource.getRepository(HermesImportStateEntity),
    {
      assertAllowed: async (candidate) =>
        assert.ok(
          allowed && [workspaceA, workspaceB].includes(candidate.workspaceId),
          'Fixture access denied',
        ),
    },
  );
  try {
    await dataSource.query(
      'INSERT INTO "core"."workspace" ("id", "displayName", "activationStatus") VALUES ($1, $3, \'PENDING_CREATION\'), ($2, $3, \'PENDING_CREATION\')',
      [workspaceA, workspaceB, 'Disposable Hermes CI fixture'],
    );
    const defaultRow = await dataSource.query(
      `INSERT INTO ${table} ("workspaceId") VALUES ($1) RETURNING "state"`,
      [workspaceB],
    );
    assert.equal(
      JSON.stringify(Object.keys(defaultRow[0].state).sort()),
      JSON.stringify(['batches', 'campaignIds', 'version']),
      'Only expected state keys',
    );
    assert.equal(defaultRow[0].state.version, 1);
    assert.equal(
      defaultRow[0].state.batches.length +
        defaultRow[0].state.campaignIds.length,
      0,
      'Generated JSONB default must match production initial state',
    );
    const makeBatch = (externalBatchId) =>
      policy.buildHermesImportBatch({
        externalBatchId,
        name: 'Synthetic import',
        sourceUrl: 'https://example.test/directory',
        collectedAt: '2026-10-29T12:00:00Z',
        userId: actor.userId,
        now: new Date().toISOString(),
        rows: [
          { email: 'person@example.test', companyName: 'Synthetic Company' },
        ],
      });
    const importBatch = (target, externalBatchId) =>
      service.mutate(target, async (state) =>
        policy.claimHermesImportBatch(state, makeBatch(externalBatchId)),
      );
    const replays = await Promise.all(
      Array.from({ length: 8 }, () => importBatch(actor, 'same-source-id')),
    );
    assert.equal(
      replays.filter((item) => !item.replay).length,
      1,
      'Concurrent imports must claim the external ID exactly once',
    );
    assert.equal(new Set(replays.map((item) => item.batch.id)).size, 1);
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        importBatch(actor, `independent-${index}`),
      ),
    );
    assert.equal(
      (await service.read(actor)).batches.length,
      9,
      'Concurrent writers must not lose imports',
    );
    assert.equal(
      (await importBatch(otherActor, 'same-source-id')).replay,
      false,
      'External ID belongs to one workspace',
    );
    assert.equal((await service.read(otherActor)).batches.length, 1);
    const repository = dataSource.getRepository(HermesImportStateEntity);
    const restartedService = new HermesImportStateService(repository, {
      assertAllowed: async () => {},
    });
    assert.equal(
      (await restartedService.read(actor)).batches.length,
      9,
      'Import state must survive service reconstruction',
    );
    const before = JSON.stringify(await service.read(actor));
    await assert.rejects(
      service.mutate(actor, async (state) => {
        state.campaignIds.push(
          'x'.repeat(policy.HERMES_IMPORT_LIMITS.stateBytes),
        );
      }),
      /IMPORT_STORAGE_LIMIT_REACHED/,
    );
    assert.equal(
      JSON.stringify(await service.read(actor)),
      before,
      'Over-limit writes must roll back',
    );
    allowed = false;
    await assert.rejects(service.read(actor), /Fixture access denied/);
    await assert.rejects(
      service.mutate(actor, async () => {}),
      /Fixture access denied/,
    );
    allowed = true;
    await dataSource.query('DELETE FROM "core"."workspace" WHERE "id" = $1', [
      workspaceA,
    ]);
    assert.equal(
      await repository.countBy({ workspaceId: workspaceA }),
      0,
      'Workspace deletion must cascade',
    );
    assert.equal(
      await repository.countBy({ workspaceId: workspaceB }),
      1,
      'Cascade must not touch another workspace',
    );
    return {
      concurrentReplay: 'passed',
      concurrentIndependentImports: 'passed',
      persistence: 'passed',
      workspaceIsolation: 'passed',
      storageRollback: 'passed',
      deniedAccessBoundary: 'passed',
      workspaceCascade: 'passed',
      nativeQualificationAndSuppression:
        'unit suite only; full provisioned-workspace API check remains separate',
    };
  } finally {
    await dataSource.query(
      'DELETE FROM "core"."workspace" WHERE "id" IN ($1, $2)',
      [workspaceA, workspaceB],
    );
    await dataSource.destroy();
  }
}

export async function main() {
  const mode = process.argv[2] ?? '--generate';
  assert.ok(['--generate', '--verify-existing'].includes(mode));
  const resetAfterGeneration = process.argv[3] === '--reset-after-generation';
  assert.ok(
    process.argv.length <= 4 &&
      (process.argv.length < 4 || resetAfterGeneration),
    'Unknown arguments',
  );
  assert.ok(
    !resetAfterGeneration || mode === '--generate',
    'Reset is only available in generation mode',
  );
  const database = assertDisposableTarget(process.env);
  for (const directory of [root, path.join(root, 'apps/crm/ui'), server]) {
    const privateFiles = readdirSync(directory).filter(
      (name) =>
        (name === '.env' || name.startsWith('.env.')) &&
        !name.endsWith('.example') &&
        !name.endsWith('.sample'),
    );
    assert.equal(
      privateFiles.length,
      0,
      'Private environment files are forbidden in the CI checkout',
    );
  }

  const artifactDirectory = path.join(root, 'hermes-migration-artifacts');
  mkdirSync(artifactDirectory, { recursive: true });
  const report = {
    mode,
    version: '2.52.0',
    commit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    status: 'running',
  };
  const saveReport = () =>
    writeFileSync(
      path.join(artifactDirectory, 'report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  saveReport();
  const requireFromServer = createRequire(path.join(server, 'package.json'));
  const appSecret = randomBytes(32).toString('hex');
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    NODE_ENV: 'production',
    NODE_OPTIONS: '--max-old-space-size=4096',
    PG_DATABASE_URL: database.href,
    REDIS_URL: process.env.REDIS_URL,
    APP_SECRET: appSecret,
    SERVER_URL: 'http://127.0.0.1:3000',
    FRONTEND_URL: 'http://127.0.0.1:3001',
    IS_BILLING_ENABLED: 'false',
    IS_FDW_ENABLED: 'false',
    IS_CONFIG_VARIABLES_IN_DB_ENABLED: 'false',
    TELEMETRY_ENABLED: 'false',
    EMAIL_DRIVER: 'logger',
    LOGGER_IS_BUFFER_ENABLED: 'false',
    REDIS_CACHE_PREFIX: `hermes-migration-${process.env.GITHUB_RUN_ID}`,
  };
  const redact = (value) =>
    String(value)
      .replaceAll(appSecret, '[redacted]')
      .replaceAll(database.href, '[disposable-db]')
      .replaceAll(database.password, '[redacted]');
  const run = (args, cwd = server, permittedStatuses = [0]) => {
    const result = spawnSync(process.execPath, args, {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 300_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.error || !permittedStatuses.includes(result.status))
      throw new Error(
        redact(
          `Command failed: ${args[0]}\n${result.error ?? ''}\n${result.stdout}\n${result.stderr}`,
        ).slice(-20_000),
      );
    return result.stdout;
  };
  const { Client } = requireFromServer('pg');
  const client = new Client({
    connectionString: database.href,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  let mainConnectionEnded = false;
  try {
    await client.connect();
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'core'",
        )
      ).rows[0].count,
      0,
      'Migration generation requires a fresh disposable database; use a separate job before runtime smoke',
    );
    assert.match(
      readFileSync(
        path.join(
          server,
          'src/engine/core-modules/upgrade/constants/twenty-current-version.constant.ts',
        ),
        'utf8',
      ),
      /KOVAALAB_CURRENT_VERSION = '2\.52\.0'/,
    );
    run(['dist/database/scripts/setup-db.js']);
    run([
      'dist/command/command.js',
      'run-instance-commands',
      '--force',
      '--include-slow',
    ]);
    const versionDirectory = path.join(server, commandDirectory, '2-52');
    const beforeFiles = readdirSync(versionDirectory);
    const manifestPath = path.join(
      server,
      commandDirectory,
      'instance-commands.constant.ts',
    );
    const beforeManifest = readFileSync(manifestPath, 'utf8');
    const findGenerated = () =>
      readdirSync(versionDirectory).filter((name) =>
        name.endsWith(`-${migrationName}.ts`),
      );
    if (mode === '--generate') {
      assert.equal(
        findGenerated().length,
        0,
        'Migration already exists: use --verify-existing after rebuilding',
      );
      assert.equal(
        (await client.query('SELECT to_regclass($1) AS name', [table])).rows[0]
          .name,
        null,
      );
      run([
        'dist/command/command.js',
        'generate:instance-command',
        '--name',
        migrationName,
        '--type',
        'fast',
        '--version',
        '2.52.0',
      ]);
    }
    const files = findGenerated();
    assert.equal(
      files.length,
      1,
      'Official generator must produce exactly one current migration',
    );
    const migrationPath = path.join(versionDirectory, files[0]);
    const source = readFileSync(migrationPath, 'utf8');
    const manifest = readFileSync(manifestPath, 'utf8');
    const className = 'AddHermesImportStateFastInstanceCommand';
    assert.ok(
      manifest.includes(`import { ${className} }`) &&
        manifest.includes(`  ${className},`),
      'Official generator registration missing',
    );
    const timestamp = Number(
      source.match(/@RegisteredInstanceCommand\('2\.52\.0', (\d+)\)/)?.[1],
    );
    assert.ok(Number.isSafeInteger(timestamp));
    if (mode === '--generate') {
      const olderTimestamps = beforeFiles
        .map((name) =>
          Number(name.match(/instance-command-(?:fast|slow)-(\d+)/)?.[1]),
        )
        .filter(Number.isFinite);
      assert.ok(
        timestamp > Math.max(...olderTimestamps),
        'Generated timestamp must follow current migrations',
      );
      assert.equal(
        manifest
          .replace(
            `import { ${className} } from 'src/database/commands/upgrade-version-command/2-52/${files[0].slice(0, -3)}';\n`,
            '',
          )
          .replace(`  ${className},\n`, ''),
        beforeManifest,
        'Generator may only append its own registration',
      );
    }
    const generated = loadSource(requireFromServer, migrationPath, {
      typeorm: requireFromServer('typeorm'),
      'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator':
        { RegisteredInstanceCommand: () => (target) => target },
    });
    const instance = new generated[className]();
    const up = [];
    const down = [];
    await instance.up({
      query: async (query, parameters) => {
        assert.ok(!parameters?.length);
        up.push(query);
      },
    });
    await instance.down({
      query: async (query, parameters) => {
        assert.ok(!parameters?.length);
        down.push(query);
      },
    });
    writeFileSync(
      path.join(artifactDirectory, 'generated-sql.json'),
      `${JSON.stringify({ up, down }, null, 2)}\n`,
    );
    const relativeMigration = path.relative(root, migrationPath);
    const relativeManifest = path.relative(root, manifestPath);
    for (const filename of [relativeMigration, relativeManifest]) {
      const destination = path.join(artifactDirectory, filename);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, readFileSync(path.join(root, filename)));
    }
    validateMigrationSql(up, down);
    if (mode === '--generate') {
      const git = (args, statuses = [0]) => {
        const result = spawnSync('git', args, {
          cwd: root,
          env,
          encoding: 'utf8',
          timeout: 10_000,
        });
        assert.ok(
          statuses.includes(result.status),
          'Unable to produce reviewable migration patch',
        );
        return result.stdout;
      };
      writeFileSync(
        path.join(artifactDirectory, 'migration.patch'),
        git(['diff', '--', relativeManifest]) +
          git(
            ['diff', '--no-index', '--', '/dev/null', relativeMigration],
            [1],
          ),
      );
      for (const query of up) await client.query(query);
    }
    report.integration = await checkImportTransactions(
      requireFromServer,
      database,
    );
    for (const query of down) await client.query(query);
    assert.equal(
      (await client.query('SELECT to_regclass($1) AS name', [table])).rows[0]
        .name,
      null,
    );
    for (const query of up) await client.query(query);
    assert.ok(
      (await client.query('SELECT to_regclass($1) AS name', [table])).rows[0]
        .name,
    );
    const orphanWorkspace = randomUUID();
    await assert.rejects(
      client.query(`INSERT INTO ${table} ("workspaceId") VALUES ($1)`, [
        orphanWorkspace,
      ]),
      (error) => error.code === '23503',
    );
    if (resetAfterGeneration) {
      assert.equal(
        (
          await client.query(
            'SELECT count(*)::int AS count FROM "core"."workspace"',
          )
        ).rows[0].count,
        0,
        'All synthetic workspaces must be removed before reset',
      );
      await client.end();
      mainConnectionEnded = true;
      // The only administrative target is the disposable service's postgres
      // catalog; SQL identifiers below are fixed, never user controlled.
      assertDisposableTarget(process.env);
      const adminUrl = new URL(database.href);
      adminUrl.pathname = '/postgres';
      const admin = new Client({
        connectionString: adminUrl.href,
        connectionTimeoutMillis: 10_000,
        statement_timeout: 30_000,
      });
      try {
        await admin.connect();
        assert.equal(
          (await admin.query('SELECT current_database() AS name')).rows[0].name,
          'postgres',
        );
        const target = await admin.query(
          "SELECT pg_get_userbyid(datdba) = current_user AS owned FROM pg_database WHERE datname = 'p0_ci'",
        );
        assert.equal(target.rows[0]?.owned, true);
        await admin.query('DROP DATABASE "p0_ci" WITH (FORCE)');
        await admin.query('CREATE DATABASE "p0_ci" OWNER "postgres"');
        report.disposableDatabaseReset = true;
      } finally {
        await admin.end();
      }
    }
    report.status = 'passed';
    report.migration = relativeMigration;
    report.generatedTimestamp = timestamp;
    report.roundTrip = 'up/down/up passed; FK rejects orphan workspace';
    console.info(
      'Hermes CI: official migration artifact and disposable PostgreSQL import checks passed',
    );
  } catch (error) {
    report.status = 'failed';
    report.error = redact(error instanceof Error ? error.message : error);
    throw new Error(report.error);
  } finally {
    saveReport();
    if (!mainConnectionEnded) await client.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
