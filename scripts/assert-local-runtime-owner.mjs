import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export function assertLocalRuntimeOwner(root) {
  const metadata = resolve(root, ".git");
  if (existsSync(metadata) && statSync(metadata).isFile()) {
    throw new Error(
      "Les profils locaux historiques partagent leurs bases, volumes et ports. Exécuter cette commande depuis le checkout principal ; ce worktree ne possède pas un runtime isolé.",
    );
  }
}
