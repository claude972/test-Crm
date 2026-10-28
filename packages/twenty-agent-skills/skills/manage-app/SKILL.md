---
name: manage-app
description: Use when the user wants to manage or troubleshoot tooling, remotes, sync, build, deploy, logs, CI/CD, or operational workflows for an existing KovaaLab CRM app.
---

# When To Use

Pick this skill when the user wants to operate, troubleshoot, or ship an existing KovaaLab CRM app — anything between "I have an app" and "it runs in production". Representative triggers:

- "sync my app changes to the server"
- "deploy my KovaaLab CRM app to production"
- "check the logs for my logic function"
- "switch to a different KovaaLab CRM remote / instance"
- "add a new remote for staging"
- "set up CI/CD for my KovaaLab CRM app"
- "troubleshoot a failed deploy / sync / build"
- "uninstall my app from production"
- "run tests for my KovaaLab CRM app"
- "run my logic function manually for testing"

Do not use this skill to scaffold (use `create-app`), to change app entities or code (use `develop-app`), to prepare marketplace assets (use `publish-app`), or to query workspace records (use `use-kovaa-lab-mcp`).

# Boundaries

For background on how KovaaLab CRM apps work — the SDK packages, remotes, sync lifecycle, and rendering model — read `../../references/concepts/how-apps-work.md`. Cross-skill operating rules that apply to every KovaaLab CRM app task are in `../../references/concepts/operating-rules.md`; they are authoritative and not restated per skill.

Do not scaffold a new app here. Use `$create-app` when the app does not exist.

Do not add or modify app entities here. Use `$develop-app` for objects, fields, logic functions, roles, views, navigation, page layouts, skills, agents, connection providers, front component registration, and settings menu items.

Do not prepare marketplace README, screenshots, logos, or npm listing copy here. Use `$publish-app` for public listing work.

Do not retrieve CRM records here. Use `$use-kovaa-lab-mcp` for workspace data retrieval.

# Operating Rules

First confirm the current directory is a KovaaLab CRM app:

```bash
test -f package.json
test -f src/application-config.ts
```

Inspect current app and scripts before running operational commands:

```bash
sed -n '1,220p' package.json
kovaa-lab remote list
```

Treat deploys, uninstalls, production remote changes, and production syncs as externally visible actions. Ask for explicit confirmation before running them when the target is production or user data could be affected.

For command details, remotes, validation command semantics, sync modes, troubleshooting, build, deploy, logs, exec, and CI/CD, read `../../references/manage-app/cli-and-sync.md`.

If the user asks to run tests, also read `../../references/develop-app/tests.md` before running any test command. Full test suites include integration tests that install and uninstall the app on their target server, so start or verify the isolated test instance and run:

```bash
docker start kovaa-lab-app-dev-test
KOVAALAB_API_URL=http://localhost:2021 yarn test
```

Do not run integration tests against the dev instance on `http://localhost:2020` unless the user explicitly asks for that target. If the user asks for unit tests only, use the package's unit-test script and no `KOVAALAB_API_URL` override is needed.

# Remotes

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

# Development Sync

Always use bounded apply to synchronize app changes with the active remote:

```bash
kovaa-lab app apply
```

Do not use bare `kovaa-lab app dev` (watch mode). Run `kovaa-lab app apply` each time changes need to be synced.

Bounded apply requires an authenticated remote. If authentication fails, re-add or switch the remote before retrying.

# Troubleshooting

Start by identifying which layer is failing:

- Remote/authentication.
- Dev sync or bounded apply.
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
- If the app depends on a changed data model, use `$develop-app` to fix the entity definitions.

For build or deploy issues:

- Run `kovaa-lab app build` before `kovaa-lab app publish --private` or `kovaa-lab app publish`.
- Check `package.json` version when updating an already deployed app.
- Confirm the target with `kovaa-lab app publish --private --remote <name>` instead of relying on the active remote when production is involved.

For runtime behavior:

- Use `kovaa-lab app logs` to inspect function execution logs.
- Use `kovaa-lab app exec --name <function-name> --payload '<json>'` to reproduce a logic function with a controlled payload.

For CI/CD failures:

- Check `.github/workflows/`.
- Confirm `KOVAALAB_DEPLOY_URL` points to a reachable server from the runner.
- Confirm `KOVAALAB_DEPLOY_API_KEY` is configured as a secret, not committed in source.

# Build And Deploy

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

Use `$publish-app` instead when the user wants npm marketplace publishing, listing copy, screenshots, or public app store metadata.

# Logs, Exec, And Cleanup

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

# CI/CD

Apps generated with `kovaa-lab app init` can use GitHub Actions for CI and CD. For deployment automation, check the app's `.github/workflows/` files and configure:

- `KOVAALAB_DEPLOY_URL`
- `KOVAALAB_DEPLOY_API_KEY`

Do not put API keys in source files. Use the repository or CI secret store.
