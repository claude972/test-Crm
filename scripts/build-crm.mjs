import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const ui = resolve(root, "apps/crm/ui");
const yarn = resolve(ui, ".yarn/releases/yarn-4.18.1.cjs");
const cache = resolve(root, "../runtime-local/npm-cache");
const action = process.argv[2] ?? "build";
const [major, minor] = process.versions.node.split(".").map(Number);

function run(args, cwd = ui, extraEnvironment = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      NX_PARALLEL: process.env.NX_PARALLEL ?? "1",
      GOMAXPROCS: process.env.GOMAXPROCS ?? "2",
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=4096",
      npm_config_cache: cache,
      ...extraEnvironment,
    },
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `La commande ${basename(args.find((argument) => !argument.startsWith("-")) ?? args[0])} a échoué (${result.status ?? result.error?.code}).`,
    );
}

try {
  if (major !== 24 || minor < 5)
    throw new Error(
      "Le workspace CRM demande Node.js 24.5 ou plus récent dans la branche 24.",
    );
  if (!["install", "build", "check"].includes(action))
    throw new Error("Usage : node scripts/build-crm.mjs <install|build|check>");
  mkdirSync(cache, { recursive: true });
  if (action === "install") {
    run([yarn, "install", "--immutable"]);
  } else {
    if (!existsSync(resolve(ui, "node_modules/.bin/tsgo")))
      throw new Error("Installer les dépendances avec build-crm.mjs install.");
    if (action === "build") {
      if (!existsSync(resolve(ui, ".runtime/front.env")))
        throw new Error("Créer la configuration avec local-project.mjs setup.");
      run([yarn, "nx", "build", "kovaa-lab-server", "--skip-nx-cache"]);
      run([
        yarn,
        "workspace",
        "kovaa-lab-front",
        "exec",
        "lingui",
        "compile",
        "--typescript",
      ]);
      run(
        [
          "--env-file=../../.runtime/front.env",
          "../../node_modules/vite/bin/vite.js",
          "build",
        ],
        resolve(ui, "packages/twenty-front"),
        { NODE_ENV: "production" },
      );
    }
    for (const workspace of ["twenty-server", "twenty-front"]) {
      console.log(`Contrôle TypeScript : ${workspace}`);
      run(
        [
          resolve(ui, "node_modules/.bin/tsgo"),
          "-p",
          "tsconfig.json",
          "--noEmit",
          "--singleThreaded",
        ],
        resolve(ui, "packages", workspace),
      );
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
