// Real B ingress and D rotations, with separate native PG pools and held locks.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const native = (name) => require(path.join(process.cwd(), "dist", name));
exports.proveIngressGuards = async ({
  source,
  gate,
  service,
  actor,
  access,
  encryption,
  accountEncryption,
}) => {
  const { DataSource } = require(
    path.join(process.cwd(), "../../node_modules/typeorm"),
  );
  const { HermesConnectionsService } = native(
    "engine/core-modules/hermes-connections/hermes-connections.service.js",
  );
  const { HermesMediaService } = native(
    "engine/core-modules/hermes-media/hermes-media.service.js",
  );
  const { HermesMessagingService } = native(
    "engine/core-modules/hermes-messaging/hermes-messaging.service.js",
  );
  const { messagingId } = native(
    "engine/core-modules/hermes-messaging/hermes-messaging.policy.js",
  );
  const control = new DataSource({
    ...source.options,
    poolSize: 1,
    extra: {
      ...source.options.extra,
      application_name: "hermes-connections-rotation-pool1-proof",
    },
  });
  await control.initialize();
  const rotation = new HermesConnectionsService(
    control,
    access,
    encryption,
    accountEncryption,
  );
  const write = (revision, secret) => ({
    kind: "EVOLUTION",
    expectedRevision: revision,
    settings: {
      baseUrl: "https://8.8.8.8",
      instanceName: "disposable-fixture",
    },
    secrets: {
      apiKey: "fixture-no-provider-call",
      webhookSecret: secret.repeat(64),
    },
  });
  const waitLock = async (name) => {
    for (let i = 0; i < 100; i++) {
      await gate.query("SELECT pg_stat_clear_snapshot()");
      if (
        (
          await gate.query(
            "SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'",
            [name],
          )
        ).rows[0].n === 1
      )
        return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("Expected native PG lock waiter missing");
  };
  const assertBound = (snapshot) => async (manager) => {
    const current = await service.resolve(
      actor.workspaceId,
      "EVOLUTION",
      manager,
    );
    assert.ok(
      current &&
        current.connectionId === snapshot.connectionId &&
        current.revision === snapshot.revision,
      "STALE_CONNECTION",
    );
  };
  let writes = 0;
  const forbidden = () => {
    writes++;
    throw new Error("Unexpected native side effect");
  };
  const media = new HermesMediaService(
    source,
    access,
    { uploadFile: forbidden },
    { delete: forbidden },
    {},
    {},
  );
  const inbox = new HermesMessagingService(
    source,
    access,
    { get: forbidden },
    { synchronize: forbidden },
  );
  try {
    await rotation.save(actor, write(0, "1"));
    const modes = ["OFF", "ASSISTED", "INHERIT", "AUTO"];
    const ids = [];
    for (const mode of modes) {
      const id = randomUUID();
      ids.push(id);
      await gate.query(
        'INSERT INTO core."hermesConversation" ("id","workspaceId","channel","providerConnectionId","providerConversationId","contactHandle","lastMessageAt","botMode","botOwnerUserWorkspaceId","botModeUpdatedAt") VALUES ($1::uuid,$2,\'WHATSAPP\',\'fixture-connection\',$1::uuid::text,\'33612345678@s.whatsapp.net\',now(),$3,$4,\'2000-01-01\')',
        [id, actor.workspaceId, mode, actor.userWorkspaceId],
      );
    }
    let snapshot = await service.resolve(actor.workspaceId, "EVOLUTION");
    const providerMessageId = randomUUID();
    const assetId = messagingId(
      actor.workspaceId,
      snapshot.connectionId,
      "media",
      providerMessageId,
    );
    await gate.query("BEGIN");
    await gate.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `hermes-media:${assetId}`,
    ]);
    const receive = media.receive(
      {
        workspaceId: actor.workspaceId,
        conversationId: ids[0],
        providerConnectionId: snapshot.connectionId,
        providerMessageId,
        kind: "IMAGE",
        filename: "fixture.png",
        mimeType: "image/png",
        bytes: Buffer.from("disposable-fixture"),
      },
      { assertLive: assertBound(snapshot) },
    );
    const rejectedMedia = assert.rejects(receive, /STALE_CONNECTION/);
    await waitLock("hermes-connections-pool1-proof");
    await rotation.save(actor, write(1, "2"));
    await gate.query("COMMIT");
    await rejectedMedia;
    assert.equal(writes, 0);
    const assets = await gate.query(
      'SELECT count(*)::int AS n FROM core."hermesMediaAsset" WHERE "workspaceId"=$1',
      [actor.workspaceId],
    );
    assert.equal(assets.rows[0].n, 0);
    const persistedModes = (
      await gate.query(
        'SELECT "id","botMode","botOwnerUserWorkspaceId","botModeUpdatedAt" FROM core."hermesConversation" WHERE "id"=ANY($1::uuid[])',
        [ids],
      )
    ).rows;
    for (let i = 0; i < modes.length; i++) {
      const row = persistedModes.find((row) => row.id === ids[i]);
      assert.equal(row.botMode, modes[i] === "AUTO" ? "MANUAL" : modes[i]);
      assert.equal(row.botOwnerUserWorkspaceId, null);
      assert.ok(row.botModeUpdatedAt > new Date("2000-01-01"));
    }
    snapshot = await service.resolve(actor.workspaceId, "EVOLUTION");
    await gate.query("BEGIN");
    await gate.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `hermes-messaging:${actor.workspaceId}`,
    ]);
    const rotate = rotation.save(actor, write(2, "3"));
    await waitLock("hermes-connections-rotation-pool1-proof");
    const ingest = inbox.ingest(
      {
        workspaceId: actor.workspaceId,
        channel: "WHATSAPP",
        direction: "INBOUND",
        providerConnectionId: snapshot.connectionId,
        providerConversationId: randomUUID(),
        providerMessageId: randomUUID(),
        contactHandle: "33612345678@s.whatsapp.net",
        text: "disposable stale ingress",
        occurredAt: new Date().toISOString(),
      },
      { suppressAutomation: true, assertLive: assertBound(snapshot) },
    );
    const rejectedIngest = assert.rejects(ingest, /STALE_CONNECTION/);
    await waitLock("hermes-connections-pool1-proof");
    await gate.query("COMMIT");
    await rotate;
    await rejectedIngest;
    assert.equal(
      (
        await gate.query(
          'SELECT count(*)::int AS n FROM core."hermesInboxMessage" WHERE "workspaceId"=$1',
          [actor.workspaceId],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await gate.query(
          'SELECT count(*)::int AS n FROM core."hermesConversation" WHERE "workspaceId"=$1',
          [actor.workspaceId],
        )
      ).rows[0].n,
      4,
    );
    assert.equal(writes, 0);
    return [
      "native-media-receive-asset-lock-then-D-rotation-zero-files-pool1",
      "native-inbox-ingest-messaging-lock-then-D-rotation-zero-messages-pool1",
      "native-D-rotation-preserves-OFF-ASSISTED-INHERIT-and-clears-AUTO-grant",
    ];
  } finally {
    await gate.query("ROLLBACK").catch(() => undefined);
    await control.destroy();
  }
};
