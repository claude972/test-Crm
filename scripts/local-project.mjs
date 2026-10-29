import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  fchmodSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = realpathSync(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const runtime = resolve(root, "../runtime-local");
const ui = resolve(root, "apps/crm/ui");
const stateDirectory = resolve(root, ".runtime/launch");
const stateFile = resolve(stateDirectory, "pids.json");
const action = process.argv[2] ?? "status";
const localDocker = resolve(homedir(), ".local/bin/docker");
const docker =
  process.env.DOCKER_BIN ?? (existsSync(localDocker) ? localDocker : "docker");
const context = process.env.DOCKER_CONTEXT ?? "colima-hermes-crm";
const crmCompose = resolve(root, "infra/crm.compose.yml");
const services = {
  api: {
    cwd: resolve(ui, "packages/twenty-server"),
    entry: "dist/main.js",
    args: [
      "--max-old-space-size=1536",
      "--env-file=../../.runtime/server.env",
      "dist/main.js",
    ],
  },
  worker: {
    cwd: resolve(ui, "packages/twenty-server"),
    entry: "dist/queue-worker/queue-worker.js",
    args: [
      "--max-old-space-size=1024",
      "--env-file=../../.runtime/server.env",
      "dist/queue-worker/queue-worker.js",
    ],
  },
  front: {
    cwd: resolve(ui, "packages/twenty-front"),
    entry: "node_modules/vite/bin/vite.js",
    args: [
      "--max-old-space-size=768",
      "--env-file=../../.runtime/front.env",
      "../../node_modules/vite/bin/vite.js",
      "preview",
      "--strictPort",
      "--host",
      "127.0.0.1",
      "--port",
      "3001",
    ],
  },
};

function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${binary} a échoué (${result.status ?? result.error?.code}).`,
    );
}

function setup() {
  run(process.execPath, [resolve(root, "scripts/customer-tools.mjs"), "setup"]);
  mkdirSync(resolve(ui, ".runtime"), { recursive: true, mode: 0o700 });
  const writeConfiguration = (name, values) => {
    const path = resolve(ui, ".runtime", name);
    if (!existsSync(path))
      writeFileSync(
        path,
        Object.entries(values)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n") + "\n",
        { mode: 0o600, flag: "wx" },
      );
  };
  writeConfiguration("infra.env", {
    POSTGRES_PASSWORD: randomBytes(32).toString("hex"),
  });
  const password = parseEnv(
    readFileSync(resolve(ui, ".runtime/infra.env"), "utf8"),
  ).POSTGRES_PASSWORD;
  if (!password)
    throw new Error("POSTGRES_PASSWORD absent du fichier privé infra.env.");
  writeConfiguration("server.env", {
    NODE_ENV: "development",
    NODE_PORT: "3000",
    NODE_HOST: "127.0.0.1",
    PG_DATABASE_URL: `postgresql://hermes_crm:${encodeURIComponent(password)}@localhost:5438/hermes_crm_dev`,
    REDIS_URL: "redis://localhost:6388",
    APP_SECRET: randomBytes(64).toString("hex"),
    FRONTEND_URL: "http://localhost:3001",
    SERVER_URL: "http://localhost:3000",
    AUTH_PASSWORD_ENABLED: "true",
    IS_EMAIL_VERIFICATION_REQUIRED: "false",
    SIGN_IN_PREFILLED: "false",
    IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS: "false",
    EMAIL_DRIVER: "SMTP",
    EMAIL_SMTP_HOST: "127.0.0.1",
    EMAIL_SMTP_PORT: "1025",
    EMAIL_SMTP_NO_TLS: "true",
    EMAIL_FROM_ADDRESS: "notifications@hermes.example.test",
    EMAIL_FROM_NAME: "Hermes CRM",
  });
  writeConfiguration("front.env", {
    REACT_APP_SERVER_BASE_URL: "http://localhost:3000",
    REACT_APP_PORT: "3001",
    REACT_APP_CHAR_URL: "http://localhost:3011",
    REACT_APP_FORMS_URL: "http://localhost:9157",
    REACT_APP_CAL_DIY_URL: "http://localhost:3010",
  });
  console.log(
    "Configuration locale prête ; les fichiers et secrets existants sont conservés.",
  );
}

function startInfrastructure() {
  const dockerReady =
    spawnSync(docker, ["--context", context, "info"], { stdio: "ignore" })
      .status === 0;
  if (!dockerReady) {
    const colima = resolve(homedir(), ".local/bin/colima");
    if (
      !existsSync(colima) ||
      !existsSync(resolve(runtime, "colima/hermes-crm/colima.yaml"))
    )
      throw new Error("VM Docker indisponible ; consulter infra/README.md.");
    run(colima, ["start", "hermes-crm", "--activate=false"], {
      env: {
        ...process.env,
        COLIMA_HOME: resolve(runtime, "colima"),
        LIMA_HOME: resolve(runtime, "lima"),
      },
    });
  }
  run(docker, [
    "--context",
    context,
    "compose",
    "--env-file",
    resolve(ui, ".runtime/infra.env"),
    "-f",
    crmCompose,
    "up",
    "-d",
    "--wait",
  ]);
  run(docker, [
    "--context",
    context,
    "compose",
    "--env-file",
    resolve(root, ".runtime/customer-tools.env"),
    "-f",
    resolve(root, "infra/modules.compose.yml"),
    "--profile",
    "calendar",
    "up",
    "-d",
    "--wait",
    "mailpit",
  ]);
}

function matchingProcess(pid, service) {
  const args =
    spawnSync("ps", ["-ww", "-p", String(pid), "-o", "args="], {
      encoding: "utf8",
    }).stdout ?? "";
  if (!args.includes(service.entry)) return false;
  const cwd =
    spawnSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
      encoding: "utf8",
    }).stdout ?? "";
  return cwd.split("\n").includes(`n${service.cwd}`);
}

function existingProcess(service) {
  const processes =
    spawnSync("ps", ["-axww", "-o", "pid=,command="], { encoding: "utf8" })
      .stdout ?? "";
  for (const line of processes.split("\n")) {
    if (!line.includes(service.entry)) continue;
    const pid = Number(line.trim().split(/\s+/)[0]);
    if (pid && matchingProcess(pid, service)) return pid;
  }
  return null;
}

async function waitForCRM(pids) {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const ready = await Promise.all(
      ["http://localhost:3000/healthz", "http://localhost:3001"].map(
        async (url) => {
          try {
            const response = await fetch(url, {
              redirect: "manual",
              signal: AbortSignal.timeout(2000),
            });
            await response.body?.cancel();
            return response.status >= 200 && response.status < 400;
          } catch {
            return false;
          }
        },
      ),
    );
    const processesAlive = Object.entries(services).every(([name, service]) =>
      matchingProcess(pids[name], service),
    );
    if (!processesAlive)
      throw new Error(
        "Un processus CRM s’est arrêté ; consulter runtime-local/crm-*.log.",
      );
    if (ready.every(Boolean)) return;
    await new Promise((accept) => setTimeout(accept, 1000));
  }
  throw new Error(
    "Le CRM n’est pas devenu disponible en trois minutes ; consulter runtime-local/crm-*.log.",
  );
}

async function status(names) {
  const endpoints = {
    crm: "http://localhost:3000/healthz",
    interface: "http://localhost:3001",
    char: "http://localhost:3011",
    forms: "http://localhost:9157/health/ready",
    calendar: "http://localhost:3010",
    mail: "http://localhost:8025/readyz",
  };
  const checks = await Promise.all(
    Object.entries(endpoints)
      .filter(([name]) => !names || names.includes(name))
      .map(async ([name, url]) => {
        try {
          const response = await fetch(url, {
            redirect: "manual",
            signal: AbortSignal.timeout(15000),
          });
          await response.body?.cancel();
          return [
            name,
            {
              url,
              status: response.status,
              available: response.status >= 200 && response.status < 400,
            },
          ];
        } catch {
          return [name, { url, available: false }];
        }
      }),
  );
  const report = Object.fromEntries(checks);
  report.worker = { available: existingProcess(services.worker) !== null };
  console.log(JSON.stringify(report, null, 2));
  if (Object.values(report).some((check) => !check.available))
    process.exitCode = 1;
}

try {
  if (action === "setup") {
    setup();
  } else if (action === "init") {
    if (existingProcess(services.api) || existingProcess(services.worker))
      throw new Error("Arrêter le CRM avant d’initialiser ou migrer sa base.");
    if (
      !existsSync(
        resolve(services.api.cwd, "dist/database/scripts/setup-db.js"),
      )
    )
      throw new Error("Construire le serveur avant d’initialiser sa base.");
    const connectionString = parseEnv(
      readFileSync(resolve(ui, ".runtime/server.env"), "utf8"),
    ).PG_DATABASE_URL;
    const database = new URL(connectionString);
    if (
      !["localhost", "127.0.0.1"].includes(database.hostname) ||
      database.port !== "5438" ||
      database.pathname !== "/hermes_crm_dev"
    )
      throw new Error(
        "La commande init est réservée à la base locale hermes_crm_dev sur le port 5438.",
      );
    startInfrastructure();
    const { Client } = createRequire(resolve(services.api.cwd, "package.json"))(
      "pg",
    );
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 5000,
    });
    let freshDatabase;
    try {
      await client.connect();
      const result = await client.query(
        "SELECT count(*) AS count FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog') AND table_type = 'BASE TABLE'",
      );
      freshDatabase = result.rows[0].count === "0";
    } finally {
      await client.end();
    }
    const args = [
      "--max-old-space-size=1536",
      "--env-file=../../.runtime/server.env",
    ];
    run(process.execPath, [...args, "dist/database/scripts/setup-db.js"], {
      cwd: services.api.cwd,
    });
    run(
      process.execPath,
      [
        ...args,
        "dist/command/command.js",
        ...(freshDatabase
          ? ["run-instance-commands", "--include-slow", "--force"]
          : ["upgrade"]),
      ],
      { cwd: services.api.cwd },
    );
  } else if (action === "status") {
    await status();
  } else if (action === "start" || action === "start-crm") {
    mkdirSync(runtime, { recursive: true });
    mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
    if (!existsSync(resolve(ui, ".runtime/server.env")))
      throw new Error(
        "Configuration CRM absente : initialiser le workspace avant son lancement.",
      );
    if (!existsSync(resolve(ui, "packages/twenty-front/build/index.html")))
      throw new Error(
        "Interface compilée absente : construire le frontend avant le lancement.",
      );
    startInfrastructure();
    const pids = {};
    for (const [name, service] of Object.entries(services)) {
      const existing = existingProcess(service);
      if (existing) {
        pids[name] = existing;
        console.log(`${name} : processus existant réutilisé.`);
        continue;
      }
      if (!existsSync(resolve(service.cwd, service.entry)) && name !== "front")
        throw new Error(`Compilation manquante pour ${name}.`);
      const log = openSync(resolve(runtime, `crm-${name}.log`), "a", 0o600);
      fchmodSync(log, 0o600);
      const child = spawn(process.execPath, service.args, {
        cwd: service.cwd,
        detached: true,
        stdio: ["ignore", log, log],
      });
      closeSync(log);
      await new Promise((accept, reject) => {
        child.once("spawn", accept);
        child.once("error", reject);
      });
      child.unref();
      pids[name] = child.pid;
      writeFileSync(stateFile, JSON.stringify(pids, null, 2), { mode: 0o600 });
      console.log(`${name} : démarré.`);
    }
    writeFileSync(stateFile, JSON.stringify(pids, null, 2), { mode: 0o600 });
    await waitForCRM(pids);
    if (action === "start") {
      for (const profile of ["forms", "char", "calendar"])
        run(
          process.execPath,
          [resolve(root, "scripts/customer-tools.mjs"), "start", profile],
          {
            env: {
              ...process.env,
              DOCKER_BIN: docker,
              DOCKER_CONTEXT: context,
            },
          },
        );
      await waitForCRM(pids);
    }
    await status(
      action === "start-crm" ? ["crm", "interface", "mail"] : undefined,
    );
  } else if (action === "stop") {
    const pids = existsSync(stateFile)
      ? JSON.parse(readFileSync(stateFile, "utf8"))
      : {};
    for (const [name, pid] of Object.entries(pids)) {
      if (services[name] && matchingProcess(pid, services[name]))
        process.kill(pid, "SIGTERM");
    }
    const deadline = Date.now() + 30000;
    while (
      Object.entries(pids).some(
        ([name, pid]) => services[name] && matchingProcess(pid, services[name]),
      )
    ) {
      if (Date.now() >= deadline)
        throw new Error(
          "Un processus CRM ne s’est pas arrêté ; la base reste disponible.",
        );
      await new Promise((accept) => setTimeout(accept, 250));
    }
    for (const profile of ["calendar", "char", "forms"])
      run(
        process.execPath,
        [resolve(root, "scripts/customer-tools.mjs"), "stop", profile],
        {
          env: { ...process.env, DOCKER_BIN: docker, DOCKER_CONTEXT: context },
        },
      );
    run(docker, [
      "--context",
      context,
      "compose",
      "--env-file",
      resolve(root, ".runtime/customer-tools.env"),
      "-f",
      resolve(root, "infra/modules.compose.yml"),
      "--profile",
      "calendar",
      "stop",
      "mailpit",
    ]);
    run(docker, [
      "--context",
      context,
      "compose",
      "--env-file",
      resolve(ui, ".runtime/infra.env"),
      "-f",
      crmCompose,
      "stop",
    ]);
  } else {
    throw new Error(
      "Usage : node scripts/local-project.mjs <setup|init|start|start-crm|stop|status>",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
