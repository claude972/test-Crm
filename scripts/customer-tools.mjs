import { assertLocalRuntimeOwner } from "./assert-local-runtime-owner.mjs";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const environmentFile = resolve(root, ".runtime/customer-tools.env");
const [action, profile] = process.argv.slice(2);
const profiles = ["char", "forms", "calendar"];
const actions = ["start", "stop", "status", "build", "validate"];

if (action === "setup") {
  mkdirSync(dirname(environmentFile), { recursive: true, mode: 0o700 });
  if (!existsSync(environmentFile)) {
    const keys = [
      "CHAR_SECRET_KEY_BASE",
      "CHAR_DB_PASSWORD",
      "FORMS_SESSION_KEY",
      "FORMS_ENCRYPTION_KEY",
      "FORMS_INTEGRATION_KEY",
      "CAL_DB_PASSWORD",
      "CAL_AUTH_SECRET",
      "CAL_ENCRYPTION_KEY",
    ];
    const values = keys.map(
      (key) =>
        `${key}=${randomBytes(key === "CHAR_SECRET_KEY_BASE" ? 64 : key === "CAL_ENCRYPTION_KEY" ? 16 : 32).toString("hex")}`,
    );
    writeFileSync(environmentFile, values.join("\n") + "\n", { mode: 0o600 });
  }
  console.log(
    "Configuration locale prête. Les secrets existants sont conservés.",
  );
  process.exit(0);
}

if (!actions.includes(action) || !profiles.includes(profile)) {
  console.error(
    "Usage: node scripts/customer-tools.mjs setup | <start|stop|status|build|validate> <char|forms|calendar>",
  );
  process.exit(1);
}
if (!existsSync(environmentFile)) {
  console.error("Exécuter d’abord : node scripts/customer-tools.mjs setup");
  process.exit(1);
}
if (["build", "start", "stop"].includes(action)) {
  try {
    assertLocalRuntimeOwner(root);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
if (["build", "start"].includes(action)) {
  const application = { char: "bot", forms: "form", calendar: "calendar" }[profile];
  if (!existsSync(resolve(root, "apps/crm", application, "package.json"))) {
    console.error(`Sources du module ${profile} absentes de ce checkout ; consulter docs/stabilization/p0-status.md.`);
    process.exit(1);
  }
}
const services = {
  char: ["char", "char-worker", "char-init", "char-db", "char-redis"],
  forms: ["forms", "forms-db", "forms-redis"],
  calendar: ["calendar", "calendar-db"],
};
const commands = {
  start: [
    "up",
    "-d",
    "--wait",
    "--wait-timeout",
    "600",
    "mailpit",
    ...services[profile],
  ],
  stop: ["stop", ...services[profile]],
  status: ["ps", "--all", ...services[profile]],
  build: ["build", profile],
  validate: ["config", "--quiet"],
};
const localDocker = resolve(homedir(), ".local/bin/docker");
const docker =
  process.env.DOCKER_BIN ?? (existsSync(localDocker) ? localDocker : "docker");
const result = spawnSync(
  docker,
  [
    "--context",
    process.env.DOCKER_CONTEXT ?? "colima-hermes-crm",
    "compose",
    "--env-file",
    environmentFile,
    "-f",
    resolve(root, "infra/modules.compose.yml"),
    "--profile",
    profile,
    ...commands[action],
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
