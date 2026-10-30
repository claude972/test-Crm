# Server opt-in for campaign drafts on new workspaces

Base `06f3b6a8a524929ba75553646e17247125121bf3`; branch `feat/hermes-campaign-preview-optin`. Production scope is the config property and WorkspaceService activation only. No migrations, public flag list, permissions, license guards, roles, admin elevation, tracking flags, SMTP config, preview helper or workflow changes.

`HERMES_B2B_CAMPAIGNS_ENABLED` is a native BOOLEAN configuration variable, env-only and false by default. During a successfully claimed new workspace activation, after `workspaceManagerService.init` and native default feature flags, strict boolean true calls native `FeatureFlagService.enableFeatureFlags([IS_MESSAGE_CAMPAIGN_ENABLED], workspace.id)`. Only the current activation workspace is passed. The native service persists the scoped flag and invalidates/recomputes its featureFlagsMap cache. No global/default flag constant is mutated.

The existing authenticated activation resolver derives the workspace from AuthWorkspace; its legacy data argument is ignored. This change adds no API argument or alternate activation route. Existing active/created-workspace retries return before the opt-in, so changing the environment does not backfill existing workspaces. Failed native initialization never enables it; failed flag persistence follows existing activation failure handling rather than being swallowed. Pending/stale-creation retries retain normal native behavior.

The standard messageCampaign metadata and DRAFT default already exist. Initialization prepares standard metadata before flag activation; no source-level prerequisite required broader metadata edits. This is not proof of an actual onboarding/database/UI success, which must be verified on root's new isolated preview.

Preview operator conditions: configure `HERMES_B2B_CAMPAIGNS_ENABLED=true` on the NEW isolated instance before onboarding/activation. All newly activated workspaces on that instance opt in; this is an instance operator option, not a user-settable public Lab flag. Keep `EMAILING_DOMAIN_DRIVER=SMTP`, `EMAILING_SMTP_CONNECTIONS={}` and public HTTPS SERVER_URL/FRONTEND_URL for fail-closed sends. The option exposes campaign functionality under existing permissions; it does not authorize sending, create a sender/domain/relay, alter paid-plan validation, grant any role or enable open/click tracking. Workspace tracking columns retain native false defaults. Ordinary account/invitation email driver may remain logger for disposable onboarding.

Validation: 11 Jest tests pass across two suites. Actual public `WorkspaceService.activateWorkspace` is exercised with mocked infrastructure (no DB): boolean true, false/unset/string/number opt-out, precise workspace scope and only campaign flag added after native preparation, tracking/admin values unchanged, missing activation claim rejection, failed init, failed native flag write rollback, existing active workspace no-op. Config tests instantiate native ConfigVariables and inspect native metadata to confirm false default and env-only BOOLEAN. These tests do not replace native API authorization or real database integration.

Command from repository root after installing dependencies/building shared runtime:

```sh
cd apps/crm/ui/packages/twenty-server
node ../../node_modules/jest/bin/jest.js --config ./jest.config.mjs --runInBand --runTestsByPath src/engine/core-modules/workspace/services/__tests__/workspace-campaign-optin.service.spec.ts src/engine/core-modules/twenty-config/constants/__tests__/hermes-b2b-campaigns-config.spec.ts
```

Local verification used read-only installed dependencies and a temporary absolute-path Jest/SWC config; no original env/runtime files read, no DB or SMTP started, no cloud calls/push. Formatting, diff and staged secret scan passed. Full production typecheck/native onboarding remain for combined CI and preview.
