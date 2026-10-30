// No listening port and no provider secrets: bootstrap native composition roots.
const assert = require("node:assert/strict");
const path = require("node:path");
const server = process.cwd();
const native = (name) => require(path.join(server, "dist", name));
(async () => {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  const mode = process.argv[2];
  assert.ok(["SERVER", "WORKER"].includes(mode));
  const { NestFactory } = require(
    path.join(server, "../../node_modules/@nestjs/core"),
  );
  const { HermesConnectionsService } = native(
    "engine/core-modules/hermes-connections/hermes-connections.service.js",
  );
  const module =
    mode === "SERVER"
      ? native("app.module.js").AppModule
      : native("queue-worker/queue-worker.module.js").QueueWorkerModule;
  const app =
    mode === "SERVER"
      ? await NestFactory.create(module, {
          logger: ["error"],
          bufferLogs: false,
        })
      : await NestFactory.createApplicationContext(module, {
          logger: ["error"],
          bufferLogs: false,
        });
  try {
    if (mode === "SERVER") await app.init();
    assert.equal(
      app.get("HERMES_CONNECTIONS_SERVICE"),
      app.get(HermesConnectionsService),
    );
    console.log(
      "HERMES_CONNECTION_BOOT:" +
        JSON.stringify({
          mode,
          initialized: true,
          sameNativeSingleton: true,
          listening: false,
        }),
    );
  } finally {
    const { MetadataEventEmitter } = native(
      "engine/subscriptions/metadata-event/metadata-event-emitter.js",
    );
    try {
      await app.get(MetadataEventEmitter).drain();
    } catch {
      /* Worker has no metadata HTTP emitter. */
    }
    await app.close();
  }
})().catch((error) => {
  console.error(
    "Native composition bootstrap failed: " + (error?.name ?? "Error"),
  );
  process.exitCode = 1;
});
