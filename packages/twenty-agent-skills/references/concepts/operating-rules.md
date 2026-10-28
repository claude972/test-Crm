# Operating Rules

These rules apply to every KovaaLab CRM app task, in every skill and every agent harness. They exist because they have failed before.

This file is the single source of truth for the cross-skill rules. Harness-specific entry points link here instead of restating them, so the rules cannot drift between distributions.

1. **Bounded sync only.** Use `kovaa-lab app apply` to synchronize app changes. Never `kovaa-lab app dev` (watch mode). Watch mode leaks file handles and produces ambiguous failure output in agent sandboxes.

2. **Do not run broad validation unless it is requested.** After scaffolding (`kovaa-lab app init`) or after the CLI generates entities, prefer the bounded command that matches the task: `kovaa-lab app apply` for app sync, the package's unit-test script for unit tests, and `KOVAALAB_API_URL=http://localhost:2021 yarn test` for the full integration suite. Integration tests must target the isolated test instance on port `2021`, not the dev instance on port `2020`, unless the user explicitly asks otherwise.

3. **Generate new entities with a CLI.** A CLI produces the file structure, identifiers, SDK imports and boilerplate. Hand-craft an entity file only to modify an existing one, or when no option below can produce it. Take the first option that works:
   1. **The standalone `kovaa-lab` CLI, when `command -v kovaa-lab` finds it.** Run it directly, not through `yarn`. It works with or without a terminal: with `--no-input` it never prompts and exits with code 2 when a required value is missing. It covers objects, fields, logic functions and front components. For an object, pass the three `--create-*` flags so it also generates the table view, navigation menu item and record page layout that make the object visible in the UI:

      ```bash
      kovaa-lab app add object --name invoice --name-plural invoices --create-view --create-navigation-menu-item --create-page-layout --no-input
      kovaa-lab app add field --name amount --type NUMBER --object <object-uuid> --no-input
      kovaa-lab app add logic-function --name send-invoice --no-input
      kovaa-lab app add front-component --name invoice-panel --no-input
      ```

   2. **The CLI is missing**: install the standalone `kovaa-lab` package, or ask the user to install it when their environment requires that.
   3. **The entity type is unsupported**: use the corresponding `define*` export directly. The standalone CLI currently generates objects, fields, logic functions and front components.
   4. **Otherwise, write the file by hand.** Follow the example on the matching docs page (append `.md` to its URL), or an existing file of the same kind in the app, check it against the types exported by `kovaa-lab-sdk/define`, and generate every identifier with `crypto.randomUUID()` instead of inventing one.

4. **Confirm destructive operations.** Deploys to production, uninstalls, production remote changes, and production syncs require explicit user confirmation before execution. Treat `--remote production` as user-visible.

5. **Any KovaaLab CRM instance is a valid target.** The user supplies the workspace or instance URL: managed cloud, self-hosted on a custom HTTPS domain, or localhost over HTTP. Never assume or require a `kovaa-lab.com` workspace.

6. **Workspace URLs and credentials stay user-local.** Never bundle workspace-specific MCP URLs in shared or committed files. Bearer tokens, API keys, and OAuth secrets belong in the user's private client config; `KOVAALAB_DEPLOY_API_KEY` and similar live in CI secret stores, never committed in source.
