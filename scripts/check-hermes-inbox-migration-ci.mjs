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
export { assertDisposableTarget } from "./check-hermes-migration-ci.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, "apps/crm/ui/packages/twenty-server");
const commandDirectory = "src/database/commands/upgrade-version-command";
const migrationName = "add-hermes-inbox";
const tables = ["hermesConversation", "hermesInboxMessage", "hermesMailCursor"];

const indexes = {
  IDX_HERMES_CONVERSATION_TENANT_ID: [
    "hermesConversation",
    true,
    ["workspaceId", "id"],
  ],
  IDX_HERMES_CONVERSATION_PROVIDER: [
    "hermesConversation",
    true,
    [
      "workspaceId",
      "channel",
      "providerConnectionId",
      "providerConversationId",
    ],
  ],
  IDX_HERMES_CONVERSATION_INBOX: [
    "hermesConversation",
    false,
    ["workspaceId", "lastMessageAt", "id"],
  ],
  IDX_HERMES_MESSAGE_PROVIDER: [
    "hermesInboxMessage",
    true,
    ["workspaceId", "channel", "providerConnectionId", "providerMessageId"],
    "providerMessageId",
  ],
  IDX_HERMES_MESSAGE_CLIENT: [
    "hermesInboxMessage",
    true,
    ["workspaceId", "clientRequestId"],
    "clientRequestId",
  ],
  IDX_HERMES_MESSAGE_INBOX: [
    "hermesInboxMessage",
    false,
    ["workspaceId", "conversationId", "occurredAt", "id"],
  ],
};
export function validateMigrationSql(up, down) {
  assert.ok(Array.isArray(up) && Array.isArray(down));
  assert.equal(
    up.length,
    13,
    "Only three CREATE TABLE, six indexes and four FKs expected",
  );
  assert.equal(
    down.length,
    13,
    "Rollback must reverse exactly the additive objects",
  );
  const created = new Set();
  const indexed = new Set();
  const foreignKeys = new Set();
  const composite = [];
  const workspaceKeys = new Set();
  for (const query of [...up, ...down]) {
    assert.equal(typeof query, "string");
    assert.ok(
      !/[;]|--|\/\*/.test(query),
      "One uncommented SQL statement per query",
    );
  }
  for (const query of up) {
    let match;
    if (
      (match = query.match(
        /^CREATE TABLE "core"\."(hermesConversation|hermesInboxMessage|hermesMailCursor)" \(([\s\S]+)\)$/,
      ))
    ) {
      assert.ok(!created.has(match[1]));
      created.add(match[1]);
      assert.match(match[2], /"workspaceId" uuid NOT NULL/);
      assert.match(match[2], /PRIMARY KEY \(/);
      assert.ok(
        !/\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|GRANT|REVOKE|TRUNCATE|INHERITS|PARTITION|REFERENCES)\b/i.test(
          match[2],
        ),
        "CREATE TABLE must contain only columns and primary key",
      );
      assert.ok(
        !/"[^"\s]+"\./.test(match[2]),
        "No other schema object in new table body",
      );
    } else if (
      (match = query.match(
        /^CREATE (UNIQUE )?INDEX "(IDX_HERMES_[A-Z_]+)" ON "core"\."(hermesConversation|hermesInboxMessage)" \(([^)]+)\)(?: WHERE "(providerMessageId|clientRequestId)" IS NOT NULL)?\s*$/,
      ))
    ) {
      const expected = indexes[match[2]];
      assert.ok(expected && !indexed.has(match[2]));
      indexed.add(match[2]);
      assert.equal(match[3], expected[0]);
      assert.equal(Boolean(match[1]), expected[1]);
      assert.deepEqual(
        match[4].split(",").map((part) => part.trim().replace(/^"|"$/g, "")),
        expected[2],
      );
      assert.equal(match[5], expected[3]);
    } else if (
      (match = query.match(
        /^ALTER TABLE "core"\."(hermesConversation|hermesInboxMessage|hermesMailCursor)" ADD CONSTRAINT "([A-Za-z0-9_]+)" FOREIGN KEY \(([^)]+)\) REFERENCES "core"\."(workspace|hermesConversation)"\(([^)]+)\) ON DELETE CASCADE ON UPDATE NO ACTION$/,
      ))
    ) {
      const columns = (value) =>
        value.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
      const identity = `${match[1]}:${match[2]}`;
      assert.ok(!foreignKeys.has(identity));
      foreignKeys.add(identity);
      if (match[4] === "workspace") {
        assert.deepEqual(columns(match[3]), ["workspaceId"]);
        assert.deepEqual(columns(match[5]), ["id"]);
      } else {
        assert.equal(match[1], "hermesInboxMessage");
        assert.deepEqual(columns(match[3]), ["workspaceId", "conversationId"]);
        assert.deepEqual(columns(match[5]), ["workspaceId", "id"]);
        composite.push(identity);
      }
    } else assert.fail("Generated SQL is outside the additive inbox whitelist");
  }
  assert.deepEqual([...created].sort(), [...tables].sort());
  assert.deepEqual([...indexed].sort(), Object.keys(indexes).sort());
  assert.equal(foreignKeys.size, 4);
  assert.equal(composite.length, 1);
  assert.deepEqual([...workspaceKeys].sort(), [...tables].sort());
  const droppedTables = new Set();
  const droppedIndexes = new Set();
  const droppedKeys = new Set();
  for (const query of down) {
    let match;
    if (
      (match = query.match(
        /^DROP TABLE "core"\."(hermesConversation|hermesInboxMessage|hermesMailCursor)"$/,
      ))
    ) {
      assert.ok(!droppedTables.has(match[1]));
      droppedTables.add(match[1]);
    } else if (
      (match = query.match(/^DROP INDEX "core"\."(IDX_HERMES_[A-Z_]+)"$/))
    ) {
      assert.ok(indexed.has(match[1]) && !droppedIndexes.has(match[1]));
      droppedIndexes.add(match[1]);
    } else if (
      (match = query.match(
        /^ALTER TABLE "core"\."(hermesConversation|hermesInboxMessage|hermesMailCursor)" DROP CONSTRAINT "([A-Za-z0-9_]+)"$/,
      ))
    ) {
      const identity = `${match[1]}:${match[2]}`;
      assert.ok(foreignKeys.has(identity) && !droppedKeys.has(identity));
      droppedKeys.add(identity);
    } else
      assert.fail("Generated rollback is outside the additive inbox whitelist");
  }
  assert.equal(droppedTables.size, 3);
  assert.equal(droppedIndexes.size, 6);
  assert.equal(droppedKeys.size, 4);
}

async function checkInboxTransactions(requireFromServer, database) {
  const orm = requireFromServer("typeorm");
  class WorkspaceFixture {}
  orm.Entity({ name: "workspace", schema: "core" })(WorkspaceFixture);
  orm.PrimaryColumn("uuid")(WorkspaceFixture.prototype, "id");
  const workspaceImport = {
    "src/engine/core-modules/workspace/workspace.entity": {
      WorkspaceEntity: WorkspaceFixture,
    },
  };
  const { HermesConversationEntity } = loadSource(
    requireFromServer,
    path.join(
      server,
      "src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity.ts",
    ),
    { typeorm: orm, ...workspaceImport },
  );
  const { HermesInboxMessageEntity } = loadSource(
    requireFromServer,
    path.join(
      server,
      "src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity.ts",
    ),
    {
      typeorm: orm,
      ...workspaceImport,
      "src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity":
        { HermesConversationEntity },
    },
  );
  const { HermesMailCursorEntity } = loadSource(
    requireFromServer,
    path.join(
      server,
      "src/engine/core-modules/hermes-mail/hermes-mail-cursor.entity.ts",
    ),
    { typeorm: orm, ...workspaceImport },
  );
  const source = new orm.DataSource({
    type: "postgres",
    url: database.href,
    entities: [
      WorkspaceFixture,
      HermesConversationEntity,
      HermesInboxMessageEntity,
      HermesMailCursorEntity,
    ],
    synchronize: false,
    logging: false,
    poolSize: 16,
  });
  await source.initialize();
  const workspaceA = randomUUID();
  const workspaceB = randomUUID();
  const conversationA = randomUUID();
  const conversationB = randomUUID();
  const conversation = source.getRepository(HermesConversationEntity);
  const message = source.getRepository(HermesInboxMessageEntity);
  const cursor = source.getRepository(HermesMailCursorEntity);
  const makeConversation = (workspaceId, id) => ({
    id,
    workspaceId,
    channel: "WHATSAPP",
    providerConnectionId: "synthetic-evolution",
    providerConversationId: "synthetic-thread",
    contactHandle: "synthetic@example.test",
    lastMessageAt: new Date(),
  });
  const makeMessage = (
    workspaceId,
    conversationId,
    providerMessageId = "synthetic-message",
  ) => ({
    id: randomUUID(),
    workspaceId,
    conversationId,
    channel: "WHATSAPP",
    providerConnectionId: "synthetic-evolution",
    providerMessageId,
    clientRequestId: null,
    direction: "INBOUND",
    status: "RECEIVED",
    text: "Synthetic CI persistence only",
    contentDigest: "a".repeat(64),
    occurredAt: new Date(),
    canonicalMessageId: null,
  });
  const failsWith = (code) => (error) => error.code === code;
  try {
    const required = await source.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='core' AND table_name IN ('workspace','application') AND is_nullable='NO' AND column_default IS NULL AND is_identity='NO' AND is_generated='NEVER'`,
    );
    const workspaceColumns = [
      "id",
      "displayName",
      "activationStatus",
      "subdomain",
      "workspaceCustomApplicationId",
      "inviteHash",
    ];
    const applicationColumns = [
      "id",
      "workspaceId",
      "universalIdentifier",
      "name",
      "sourcePath",
      "version",
      "sourceType",
      "canBeUninstalled",
    ];
    for (const row of required)
      assert.ok(
        (row.table_name === "workspace"
          ? workspaceColumns
          : applicationColumns
        ).includes(row.column_name),
        "Fixture cannot satisfy new native required column",
      );
    await source.transaction(async (manager) => {
      for (const workspaceId of [workspaceA, workspaceB]) {
        const applicationId = randomUUID();
        await manager.query(
          `INSERT INTO "core"."workspace" ("id","displayName","activationStatus","subdomain","workspaceCustomApplicationId","inviteHash") VALUES ($1,$2,'PENDING_CREATION',$3,$4,$5)`,
          [
            workspaceId,
            "Disposable inbox CI fixture",
            `inbox-ci-${workspaceId}`,
            applicationId,
            randomUUID(),
          ],
        );
        await manager.query(
          `INSERT INTO "core"."application" ("id","workspaceId","universalIdentifier","name","sourcePath","version","sourceType","canBeUninstalled") VALUES ($1,$2,$1,$3,'workspace-custom','1.0.1','local',false)`,
          [applicationId, workspaceId, "Disposable inbox custom application"],
        );
      }
    });
    await conversation.insert(makeConversation(workspaceA, conversationA));
    await conversation.insert(makeConversation(workspaceB, conversationB));
    await assert.rejects(
      conversation.insert(makeConversation(workspaceA, randomUUID())),
      failsWith("23505"),
    );
    await assert.rejects(
      conversation.insert(makeConversation(randomUUID(), randomUUID())),
      failsWith("23503"),
    );
    await assert.rejects(
      message.insert(makeMessage(workspaceB, conversationA)),
      failsWith("23503"),
    );
    await message.insert(makeMessage(workspaceA, conversationA));
    await assert.rejects(
      message.insert(makeMessage(workspaceA, conversationA)),
      failsWith("23505"),
    );
    await message.insert(makeMessage(workspaceB, conversationB));
    const replayMessages = Array.from({ length: 8 }, () =>
      makeMessage(workspaceA, conversationA, "concurrent-provider-replay"),
    );
    await Promise.all(
      replayMessages.map((row) =>
        message.createQueryBuilder().insert().values(row).orIgnore().execute(),
      ),
    );
    assert.equal(
      await message.countBy({
        workspaceId: workspaceA,
        providerMessageId: "concurrent-provider-replay",
      }),
      1,
    );
    const requestId = randomUUID();
    await message.insert({
      ...makeMessage(workspaceA, conversationA, null),
      clientRequestId: requestId,
      direction: "OUTBOUND",
      status: "UNCONFIRMED",
    });
    await assert.rejects(
      message.insert({
        ...makeMessage(workspaceA, conversationA, null),
        clientRequestId: requestId,
      }),
      failsWith("23505"),
    );
    await message.insert({
      ...makeMessage(workspaceB, conversationB, null),
      clientRequestId: requestId,
    });
    const makeCursor = (workspaceId) => ({
      workspaceId,
      connectionId: "synthetic-mail",
      mailbox: "INBOX",
      uidValidity: "42",
      lastUid: "123",
    });
    await cursor.insert(makeCursor(workspaceA));
    await cursor.insert(makeCursor(workspaceB));
    await assert.rejects(
      cursor.insert(makeCursor(workspaceA)),
      failsWith("23505"),
    );
    await assert.rejects(
      cursor.insert(makeCursor(randomUUID())),
      failsWith("23503"),
    );
    assert.equal(
      (await cursor.findOneByOrFail({ workspaceId: workspaceA })).lastUid,
      "123",
    );
    await source.transaction(async (manager) => {
      await manager
        .getRepository(HermesMailCursorEntity)
        .update({ workspaceId: workspaceA }, { lastUid: "124" });
    });
    assert.equal(
      (await cursor.findOneByOrFail({ workspaceId: workspaceA })).lastUid,
      "124",
    );
    assert.equal(await message.countBy({ workspaceId: workspaceB }), 2);
    await conversation.delete({ id: conversationA, workspaceId: workspaceA });
    assert.equal(await message.countBy({ workspaceId: workspaceA }), 0);
    assert.equal(await message.countBy({ workspaceId: workspaceB }), 2);
    await source.query('DELETE FROM "core"."workspace" WHERE id=$1', [
      workspaceB,
    ]);
    for (const repository of [conversation, message, cursor])
      assert.equal(await repository.countBy({ workspaceId: workspaceB }), 0);
    assert.equal(await cursor.countBy({ workspaceId: workspaceA }), 1);
    return {
      tenantCompositeForeignKey: "passed",
      providerReplayUniqueness: "passed",
      concurrentReplay: "passed",
      clientRequestUniqueness: "passed",
      tenantIsolation: "passed",
      cursorPersistence: "passed",
      conversationCascade: "passed",
      workspaceCascade: "passed",
    };
  } finally {
    await source.query('DELETE FROM "core"."workspace" WHERE id IN ($1,$2)', [
      workspaceA,
      workspaceB,
    ]);
    await source.destroy();
  }
}

export async function main() {
  const mode = process.argv[2] ?? "--generate";
  assert.ok(["--generate", "--verify-existing"].includes(mode));
  const resetAfterGeneration = [
    "--reset-after-generation",
    "--reset-after-check",
  ].includes(process.argv[3]);
  assert.ok(
    process.argv.length <= 4 &&
      (process.argv.length < 4 || resetAfterGeneration),
    "Unknown arguments",
  );
  assert.ok(
    process.argv[3] !== "--reset-after-generation" || mode === "--generate",
    "Reset is only available in generation mode",
  );
  const database = assertDisposableTarget(process.env);
  for (const directory of [root, path.join(root, "apps/crm/ui"), server]) {
    const privateFiles = readdirSync(directory).filter(
      (name) =>
        (name === ".env" || name.startsWith(".env.")) &&
        !name.endsWith(".example") &&
        !name.endsWith(".sample"),
    );
    assert.equal(
      privateFiles.length,
      0,
      "Private environment files are forbidden in the CI checkout",
    );
  }

  const artifactDirectory = path.join(root, "hermes-inbox-migration-artifacts");
  mkdirSync(artifactDirectory, { recursive: true });
  const report = {
    mode,
    version: "2.52.0",
    commit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    status: "running",
  };
  const saveReport = () =>
    writeFileSync(
      path.join(artifactDirectory, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  saveReport();
  const requireFromServer = createRequire(path.join(server, "package.json"));
  const appSecret = randomBytes(32).toString("hex");
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    CI: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    NODE_ENV: "production",
    NODE_OPTIONS: "--max-old-space-size=4096",
    PG_DATABASE_URL: database.href,
    REDIS_URL: process.env.REDIS_URL,
    APP_SECRET: appSecret,
    SERVER_URL: "http://127.0.0.1:3000",
    FRONTEND_URL: "http://127.0.0.1:3001",
    IS_BILLING_ENABLED: "false",
    IS_FDW_ENABLED: "false",
    IS_CONFIG_VARIABLES_IN_DB_ENABLED: "false",
    TELEMETRY_ENABLED: "false",
    EMAIL_DRIVER: "logger",
    LOGGER_IS_BUFFER_ENABLED: "false",
    REDIS_CACHE_PREFIX: `hermes-migration-${process.env.GITHUB_RUN_ID}`,
  };
  const redact = (value) =>
    String(value)
      .replaceAll(appSecret, "[redacted]")
      .replaceAll(database.href, "[disposable-db]")
      .replaceAll(database.password, "[redacted]");
  const run = (args, cwd = server, permittedStatuses = [0]) => {
    const result = spawnSync(process.execPath, args, {
      cwd,
      env,
      encoding: "utf8",
      timeout: 300_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.error || !permittedStatuses.includes(result.status))
      throw new Error(
        redact(
          `Command failed: ${args[0]}\n${result.error ?? ""}\n${result.stdout}\n${result.stderr}`,
        ).slice(-20_000),
      );
    return result.stdout;
  };
  const { Client } = requireFromServer("pg");
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
      "Migration generation requires a fresh disposable database; use a separate job before runtime smoke",
    );
    assert.match(
      readFileSync(
        path.join(
          server,
          "src/engine/core-modules/upgrade/constants/twenty-current-version.constant.ts",
        ),
        "utf8",
      ),
      /KOVAALAB_CURRENT_VERSION = '2\.52\.0'/,
    );
    run(["dist/database/scripts/setup-db.js"]);
    run([
      "dist/command/command.js",
      "run-instance-commands",
      "--force",
      "--include-slow",
    ]);
    const versionDirectory = path.join(server, commandDirectory, "2-52");
    const beforeFiles = readdirSync(versionDirectory);
    const manifestPath = path.join(
      server,
      commandDirectory,
      "instance-commands.constant.ts",
    );
    const beforeManifest = readFileSync(manifestPath, "utf8");
    const findGenerated = () =>
      readdirSync(versionDirectory).filter((name) =>
        name.endsWith(`-${migrationName}.ts`),
      );
    if (mode === "--generate") {
      assert.equal(
        findGenerated().length,
        0,
        "Migration already exists: use --verify-existing after rebuilding",
      );
      for (const name of tables)
        assert.equal(
          (
            await client.query("SELECT to_regclass($1) AS name", [
              `"core"."${name}"`,
            ])
          ).rows[0].name,
          null,
        );
      run([
        "dist/command/command.js",
        "generate:instance-command",
        "--name",
        migrationName,
        "--type",
        "fast",
        "--version",
        "2.52.0",
      ]);
    }
    const files = findGenerated();
    assert.equal(
      files.length,
      1,
      "Official generator must produce exactly one current migration",
    );
    const migrationPath = path.join(versionDirectory, files[0]);
    const source = readFileSync(migrationPath, "utf8");
    const manifest = readFileSync(manifestPath, "utf8");
    writeFileSync(
      path.join(artifactDirectory, "raw-official-command.ts"),
      source,
    );
    writeFileSync(
      path.join(artifactDirectory, "raw-official-manifest.ts"),
      manifest,
    );
    const className = "AddHermesInboxFastInstanceCommand";
    assert.ok(
      manifest.includes(`import { ${className} }`) &&
        manifest.includes(`  ${className},`),
      "Official generator registration missing",
    );
    const timestamp = Number(
      source.match(/@RegisteredInstanceCommand\('2\.52\.0', (\d+)\)/)?.[1],
    );
    assert.ok(Number.isSafeInteger(timestamp));
    if (mode === "--generate") {
      const olderTimestamps = beforeFiles
        .map((name) =>
          Number(name.match(/instance-command-(?:fast|slow)-(\d+)/)?.[1]),
        )
        .filter(Number.isFinite);
      assert.ok(
        timestamp > Math.max(...olderTimestamps),
        "Generated timestamp must follow current migrations",
      );
      assert.equal(
        manifest
          .replace(
            `import { ${className} } from 'src/database/commands/upgrade-version-command/2-52/${files[0].slice(0, -3)}';\n`,
            "",
          )
          .replace(`  ${className},\n`, ""),
        beforeManifest,
        "Generator may only append its own registration",
      );
    }
    const relativeMigration = path.relative(root, migrationPath);
    const relativeManifest = path.relative(root, manifestPath);
    for (const filename of [relativeMigration, relativeManifest]) {
      const destination = path.join(artifactDirectory, filename);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, readFileSync(path.join(root, filename)));
    }
    if (mode === "--generate") {
      const git = (args, statuses = [0]) => {
        const result = spawnSync("git", args, {
          cwd: root,
          env,
          encoding: "utf8",
          timeout: 10_000,
        });
        assert.ok(
          statuses.includes(result.status),
          "Unable to produce reviewable migration patch",
        );
        return result.stdout;
      };
      writeFileSync(
        path.join(artifactDirectory, "migration.patch"),
        git(["diff", "--", relativeManifest]) +
          git(
            ["diff", "--no-index", "--", "/dev/null", relativeMigration],
            [1],
          ),
      );
    }
    report.stage = "official-source-generated";
    saveReport();
    const generated = loadSource(requireFromServer, migrationPath, {
      typeorm: requireFromServer("typeorm"),
      "src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator":
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
      path.join(artifactDirectory, "generated-sql.json"),
      `${JSON.stringify({ up, down }, null, 2)}\n`,
    );
    validateMigrationSql(up, down);
    if (mode === "--generate") {
      for (const query of up) await client.query(query);
    }
    report.integration = await checkInboxTransactions(
      requireFromServer,
      database,
    );
    for (const query of down) await client.query(query);
    for (const name of tables)
      assert.equal(
        (
          await client.query("SELECT to_regclass($1) AS name", [
            `"core"."${name}"`,
          ])
        ).rows[0].name,
        null,
      );
    for (const query of up) await client.query(query);
    for (const name of tables)
      assert.ok(
        (
          await client.query("SELECT to_regclass($1) AS name", [
            `"core"."${name}"`,
          ])
        ).rows[0].name,
      );
    if (resetAfterGeneration) {
      assert.equal(
        (
          await client.query(
            'SELECT count(*)::int AS count FROM "core"."workspace"',
          )
        ).rows[0].count,
        0,
        "All synthetic workspaces must be removed before reset",
      );
      await client.end();
      mainConnectionEnded = true;
      // The only administrative target is the disposable service's postgres
      // catalog; SQL identifiers below are fixed, never user controlled.
      assertDisposableTarget(process.env);
      const adminUrl = new URL(database.href);
      adminUrl.pathname = "/postgres";
      const admin = new Client({
        connectionString: adminUrl.href,
        connectionTimeoutMillis: 10_000,
        statement_timeout: 30_000,
      });
      try {
        await admin.connect();
        assert.equal(
          (await admin.query("SELECT current_database() AS name")).rows[0].name,
          "postgres",
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
    report.status = "passed";
    report.migration = relativeMigration;
    report.generatedTimestamp = timestamp;
    report.roundTrip = "up/down/up passed for three additive inbox tables";
    console.info(
      "Hermes CI: official inbox migration artifact and disposable PostgreSQL tenant/replay/cascade checks passed",
    );
  } catch (error) {
    report.status = "failed";
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
