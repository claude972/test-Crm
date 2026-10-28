# CLI And Sync

Use this reference for KovaaLab CRM app CLI command behavior, remotes, authentication, sync, validation commands, build, deploy, logs, function execution, and CI/CD troubleshooting.

Use `../develop-app/app-structure.md` only for app file layout and post-entity-edit validation checklists.

## App Checks

Before running operational commands, confirm the current directory is a KovaaLab CRM app and inspect the active scripts and remotes:

```bash
test -f package.json
test -f src/application-config.ts
sed -n '1,220p' package.json
kovaa-lab remote list
```

Treat deploys, uninstalls, production remote changes, and production syncs as externally visible actions. Ask for explicit confirmation before running them when the target is production or user data could be affected.

## Validation Commands

Use these commands to validate an app after changes:

```bash
kovaa-lab app typecheck
yarn lint
```

If the app is already installed on the active remote, preview and then apply
the metadata changes:

```bash
kovaa-lab app plan
kovaa-lab app apply
```

`kovaa-lab app typecheck` checks generated app types and TypeScript compatibility. `yarn lint` checks local lint rules. `kovaa-lab app plan` previews metadata changes, and `kovaa-lab app apply` performs a bounded build/sync against the active remote.

`kovaa-lab app plan` is read-only and requires the app to already be installed
on the active remote. For a first sync, run `kovaa-lab app apply --create`; it registers
and installs the app. `kovaa-lab app init` only writes the source files, so
installation and authentication are explicit steps.

If a validation command fails because of entity definitions, switch to `develop-app` for the fix. If it fails because of remotes, authentication, build tooling, sync, logs, deploys, or CI/CD, stay in `manage-app`.

## Remotes

A remote is a KovaaLab CRM server that the app can sync or deploy to. Credentials are managed by the standalone CLI. Use `kovaa-lab auth login` and `kovaa-lab remote list`.

Common commands:

```bash
# Add a remote interactively.
kovaa-lab auth login

# Connect to a local KovaaLab CRM server.
kovaa-lab auth login --url http://localhost:2020

# Add a remote non-interactively.
printf '%s' "$KOVAALAB_API_KEY" | kovaa-lab auth login --with-token --url https://your-kovaa-lab-server.com --name production

# List configured remotes.
kovaa-lab remote list

# Switch the active remote.
kovaa-lab remote use <name>
```

When the user says "prod", "production", or "workspace de prod", identify the target remote before syncing or deploying. If it is missing, add it with `--as production` or the user-provided name.

## Development Sync

Use the bounded apply command to synchronize app changes with the active remote:

```bash
kovaa-lab app apply
```

Do not use bare `kovaa-lab app dev` (watch mode). Run `kovaa-lab app apply` each time changes need to be synced.

Apply requires an authenticated remote. If authentication fails, re-add or switch the remote before retrying.

Use JSON output to inspect structured errors from a bounded apply:

```bash
kovaa-lab app apply --json
```

## Troubleshooting

Start by identifying which layer is failing:

- Remote/authentication.
- Dev sync or apply.
- Build/package generation.
- Deploy/upload/install.
- Runtime function execution.
- CI/CD environment or secrets.

Collect the minimum useful context before changing configuration:

```bash
sed -n '1,220p' package.json
sed -n '1,220p' src/application-config.ts
kovaa-lab remote list
kovaa-lab app apply --json
```

For remote or authentication issues:

- Check that the active remote is the intended workspace or server.
- Re-run `kovaa-lab auth login --url http://localhost:2020` for local app-dev servers.
- Re-run `kovaa-lab auth login --url <url> --name <name>` for remote servers.
- Avoid overwriting a production remote until the target URL is confirmed.

For sync issues:

- Prefer `kovaa-lab app apply --json` to get a bounded failure.
- Check generated type or schema errors before editing app entities.
- If the app depends on a changed data model, use `develop-app` to fix the entity definitions.

## Build, Deploy, Logs, And Exec

Build before deploy when the user asks for release readiness or when debugging packaging issues:

```bash
kovaa-lab app build
```

Publish an app to npm, or publish privately to a configured KovaaLab CRM server registry:

```bash
kovaa-lab app publish
kovaa-lab app publish --private --remote production
kovaa-lab app install --remote production
```

Before deploying an update, check that `package.json` has a strictly higher semver `version` than the currently deployed version. Re-deploying the same version is rejected. After a private publish, install the deployed version with `kovaa-lab app install` when the target workspace should use it.

Use function logs when debugging runtime behavior on the connected server:

```bash
kovaa-lab app logs
kovaa-lab app logs --name <function-name>
```

Run a logic function manually when testing behavior without its trigger:

```bash
kovaa-lab app exec --name <function-name>
kovaa-lab app exec --name <function-name> --payload '{"key":"value"}'
```

Uninstall only after confirmation:

```bash
kovaa-lab app uninstall
kovaa-lab app uninstall --yes
```

Integration tests install and uninstall the app on their target server, so run them against the isolated test instance (`docker start kovaa-lab-app-dev-test`, port `2021`) rather than the dev instance — see `../develop-app/tests.md`.

## CI/CD

Apps generated with `kovaa-lab app init` can use GitHub Actions for CI and CD. For deployment automation, check the app's `.github/workflows/` files and configure:

- `KOVAALAB_DEPLOY_URL`
- `KOVAALAB_DEPLOY_API_KEY`

Do not put API keys in source files. Use the repository or CI secret store.
