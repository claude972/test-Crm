import { assertLocalRuntimeOwner } from "./assert-local-runtime-owner.mjs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import {
  chmod,
  copyFile,
  mkdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(
  root,
  "../backups",
  new Date().toISOString().replaceAll(":", "-"),
);
const pending = `${destination}.incomplete`;
const localDocker = resolve(homedir(), ".local/bin/docker");
const docker =
  process.env.DOCKER_BIN ?? (existsSync(localDocker) ? localDocker : "docker");
const context = process.env.DOCKER_CONTEXT ?? "colima-hermes-crm";
const manifest = { createdAt: new Date().toISOString(), format: 1, files: [] };

async function record(name) {
  const path = resolve(pending, name);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  manifest.files.push({
    name,
    bytes: (await stat(path)).size,
    sha256: hash.digest("hex"),
  });
}

async function archive(name, container, args) {
  const child = spawn(
    docker,
    ["--context", context, "exec", container, ...args],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let error = "";
  child.stderr.on("data", (chunk) => {
    if (error.length < 8192) error += chunk.toString();
  });
  const finished = new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? accept()
        : reject(
            new Error(
              `Échec de la sauvegarde ${name} (code ${code}). ${error}`,
            ),
          ),
    );
  });
  await Promise.all([
    pipeline(
      child.stdout,
      createWriteStream(resolve(pending, name), { mode: 0o600 }),
    ),
    finished,
  ]);
  await record(name);
  console.log(`${name} sauvegardé.`);
}

try {
  assertLocalRuntimeOwner(root);
  await mkdir(pending, { recursive: true, mode: 0o700 });
  for (const [name, container, user, database] of [
    ["crm", "hermes-crm-local-db-1", "hermes_crm", "hermes_crm_dev"],
    ["char", "hermes-customer-tools-char-db-1", "hermes_char", "hermes_char"],
    [
      "calendar",
      "hermes-customer-tools-calendar-db-1",
      "hermes_calendar",
      "hermes_calendar",
    ],
  ])
    await archive(`${name}.dump`, container, [
      "pg_dump",
      "-Fc",
      "-U",
      user,
      "-d",
      database,
    ]);
  await archive("forms.archive.gz", "hermes-customer-tools-forms-db-1", [
    "mongodump",
    "--db",
    "hermes_forms",
    "--archive",
    "--gzip",
    "--quiet",
  ]);
  await archive("char-storage.tar.gz", "hermes-customer-tools-char-1", [
    "tar",
    "czf",
    "-",
    "-C",
    "/app/storage",
    ".",
  ]);
  await archive("forms-uploads.tar.gz", "hermes-customer-tools-forms-1", [
    "tar",
    "czf",
    "-",
    "-C",
    "/app/packages/server/static/upload",
    ".",
  ]);
  const privateFiles = {
    "customer-tools.env": ".runtime/customer-tools.env",
    "admin-accounts.json": ".runtime/admin-accounts.json",
    "crm-server.env": "apps/crm/ui/.runtime/server.env",
    "crm-front.env": "apps/crm/ui/.runtime/front.env",
    "crm-infra.env": "apps/crm/ui/.runtime/infra.env",
  };
  for (const [name, source] of Object.entries(privateFiles)) {
    await copyFile(resolve(root, source), resolve(pending, name));
    await chmod(resolve(pending, name), 0o600);
    await record(name);
  }
  await writeFile(
    resolve(pending, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { mode: 0o600 },
  );
  await rename(pending, destination);
  console.log(`Sauvegarde locale terminée : ${destination}`);
} catch (error) {
  console.error(error.message);
  if (existsSync(pending))
    console.error(`Sauvegarde incomplète conservée dans ${pending}`);
  process.exitCode = 1;
}
