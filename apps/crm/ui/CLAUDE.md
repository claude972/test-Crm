# CLAUDE.md

KovaaLab CRM is an open-source CRM — an Nx / Yarn 4 monorepo. Main packages: `kovaa-lab-front` (React 18, Jotai, Linaria, Vite), `kovaa-lab-server` (NestJS, TypeORM, PostgreSQL, Redis, GraphQL), `kovaa-lab-shared` (isomorphic types/utils), `kovaa-lab-ui`, `kovaa-lab-sdk` (application definitions and runtime), `kovaa-lab-cli` (standalone CLI), `kovaa-lab-e2e-testing` (Playwright).

Match the surrounding code — the adjacent files in the directory you are editing beat any written rule, including for file naming, which varies by area.

## House rules

Where this repo differs from your defaults:

- Short-form `//` comments, never JSDoc blocks; comment only WHY (a constraint the code cannot express, still true for a reader who never saw your change), never WHAT.
- Types over interfaces (except when extending third-party interfaces); string literals over enums (except GraphQL enums); no `any`; descriptive generics (`TData`, not `T`).
- Named exports only. Functional components only.
- Prefer event handlers over `useEffect` for state updates.
- No abbreviations in names (`fieldMetadata`, not `fm`); constants in SCREAMING_SNAKE_CASE; component props types suffixed `Props`.
- Use existing guards and helpers before writing your own: `isDefined`, `isNonEmptyArray`, `isPlainObject`, … from `kovaa-lab-shared/utils`; `isNonEmptyString`, `isString`, `isNull`, `isObject`, … from `@sniptt/guards`. Reimplementing an existing util is the most common AI-authored defect here.
- Lingui for user-facing strings, `doNotTranslate()` from `kovaa-lab-shared/i18n` for text that must stay as written (error diagnostics, protocol tokens); Linaria (zero-runtime, styled-components pattern) for kovaa-lab-front styling.
- For KovaaLab CRM product concepts, consult `packages/kovaa-lab-ui/src/icon/icon-dictionary.md` and use the canonical icon.
- Import icons from `kovaa-lab-ui/icon`, never directly from `@tabler/icons-react`; action and status concepts should use their action or status icons.
- Test behavior, not implementation: query by user-visible text/roles, `@testing-library/user-event` for interactions.

## Comment sparingly

Most code is self-explanatory and a comment on it is just noise — cognitive overhead to read and maintenance debt to keep accurate. Only comment code that is genuinely unintuitive or complex: a non-obvious why , a workaround, a subtle invariant, a deliberate deviation from the obvious approach. Do not narrate what the code does — the code already says that. When a comment truly earns its place, keep it as terse as possible. This overrides matching the surrounding file's comment density. Write lean even in a verbose file.

Two or three lines, and a hard ceiling of five. "Terse" is not relative: much of this repo predates the rule and carries paragraph-length comments, so a file you are editing is not evidence of the standard — it is usually the thing the rule exists to stop spreading. If the why will not fit in five lines, the explanation belongs in a module docstring, a README or an ADR, and the comment is one line pointing there.

The same ceiling applies to a comment's neighbours: do not restate one fact in the Dockerfile, the manifest and the code that reads it. Put it once, where a reader hits it first, and let the others be silent.

Docstrings carry the what and the design; they are not exempt from terseness, but they are the right home for anything a comment is too small to hold.

## Commands

```bash
bash packages/kovaa-lab-utils/setup-dev-env.sh   # Postgres/Redis + DB init; only for tasks needing a running app
yarn start                                    # front + server + worker

npx jest path/to/file.spec.ts --config=packages/<pkg>/jest.config.mjs   # single test file (preferred)
npx vitest run --root packages/kovaa-lab-ui --project unit <file>          # kovaa-lab-ui runs on vitest, not jest
npx nx test kovaa-lab-server                     # package unit tests (same for kovaa-lab-front, ...)
npx nx run kovaa-lab-server:test:integration:with-db-reset
npx nx storybook:build kovaa-lab-front && npx nx storybook:test kovaa-lab-front

npx nx lint:diff-with-main kovaa-lab-server      # diff-based lint (fast; add --configuration=fix); run with typecheck after changes
npx nx fmt <pkg>                              # format
npx nx build kovaa-lab-shared                    # required before building/testing packages that depend on it
npx nx database:reset kovaa-lab-server
npx nx run kovaa-lab-front:graphql:generate      # after GraphQL schema changes (--configuration=metadata for metadata schema)
```

## Gotchas

- **`kovaa-lab-shared/dist` is per-branch state nothing tracks.** After switching branches or editing `kovaa-lab-shared`, run `npx nx build kovaa-lab-shared --skip-nx-cache` before trusting any typecheck or test failure in a dependent package.
- **Nx caching can serve a stale pass.** To verify a fix, run `npx tsgo -p tsconfig.json --noEmit` in the package directly rather than `nx typecheck`.
- **Do not commit translation catalogs unless translations are the task.** `lingui extract`/`compile` regenerate `packages/kovaa-lab-server/src/engine/core-modules/i18n/locales/*.po` and `locales/generated/*` with thousands of lines of churn as a side effect of touching any `msg` string. The i18n pipeline maintains them; leave them out of your commit.
- **Commit messages must not carry AI attribution.** CI rejects commits containing `@anthropic.com` co-author trailers or "Generated with Claude Code" lines.
- **Upgrade commands** (`packages/kovaa-lab-server/src/database/commands/upgrade-version-command/`): add or edit files only under the current `KOVAALAB_CURRENT_VERSION` directory, with a real epoch-ms timestamp strictly greater than every existing one in that directory — CI enforces both, and the upgrade cursor silently skips a command that sorts before an already-applied one. Include `up` and `down`; never rewrite committed command logic. Keep command-only helpers and constants in the version folder, never in runtime modules, and never make runtime code branch on migration state. See `packages/kovaa-lab-server/docs/UPGRADE_COMMANDS.md`.
- **Entity file changes need a generated instance command**: `npx nx run kovaa-lab-server:database:migrate:generate --name <name> --type <fast|slow>` (slow = adds a data-backfill step).
- A read-only Postgres MCP server is configured in `.mcp.json` for inspecting workspace data, metadata, and migration results. Writes go through the CLI commands above.
- E2E login: click "Continue with Email" and use the prefilled credentials.
