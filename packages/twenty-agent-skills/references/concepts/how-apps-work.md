# How KovaaLab CRM Apps Work

Use this reference to understand the KovaaLab CRM application development model before creating, developing, or deploying an app. Other references cover specific workflows; this one explains the architecture behind them.

## What Is A KovaaLab CRM App

A KovaaLab CRM app is a standalone npm package that extends a KovaaLab CRM instance. It is not part of the KovaaLab CRM server codebase. It lives in its own directory with its own `package.json`, dependencies, and source tree. When installed on a KovaaLab CRM instance, it adds objects, fields, views, page layouts, front components, logic functions, skills, agents, and more to that workspace.

The app does not run as a separate server. It is built, published, and installed into a running KovaaLab CRM instance. The instance loads the app's entities into its schema and renders the app's front components inside the workspace UI.

## SDK Packages

A KovaaLab CRM app depends on two SDK packages:

| Package             | Purpose                                                     | Used in                                                                                                      |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `kovaa-lab-sdk`        | Define app entities and access front component runtime APIs | Entity definitions (`kovaa-lab-sdk/define`), front component hooks and host APIs (`kovaa-lab-sdk/front-component`) |
| `kovaa-lab-client-sdk` | Access workspace data from front components                 | Core object queries (`kovaa-lab-client-sdk/core`), metadata queries (`kovaa-lab-client-sdk/metadata`)              |

`kovaa-lab-sdk/define` provides the registration functions: `defineApplication`, `defineObject`, `defineField`, `defineView`, `definePageLayout`, `defineFrontComponent`, `defineSettingsMenuItem`, `defineNavigationMenuItem`, `defineLogicFunction`, `defineRole`, and others. Every app entity is declared through one of these functions.

`kovaa-lab-sdk/front-component` provides runtime APIs available inside front components: `navigate`, `enqueueSnackbar`, `openSidePanelPage`, `useSelectedRecordIds`, `getApplicationVariable`, and others.

KovaaLab CRM UI components (`Button`, `Chip`, `Tag`, `Status`, `Heading`, `Section`, `ThemeProvider`, icons, `themeCssVariables`) live in the `kovaa-lab-ui` package. Install `kovaa-lab-ui` from npm at the same version as `kovaa-lab-sdk` and `kovaa-lab-client-sdk` and import from its subpaths (`kovaa-lab-ui/primitives/input`, `kovaa-lab-ui/primitives/data-display`, `kovaa-lab-ui/icon`, `kovaa-lab-ui/primitives/typography`, `kovaa-lab-ui/components`, `kovaa-lab-ui/theme`, and others).

`kovaa-lab-client-sdk/core` provides `CoreApiClient` for querying and mutating workspace records (companies, people, custom objects). `kovaa-lab-client-sdk/metadata` provides access to workspace metadata (object definitions, field definitions).

## KovaaLab CRM Instances And Remotes

A KovaaLab CRM instance is a running KovaaLab CRM server — either self-hosted or managed cloud. Each instance hosts one or more workspaces. Apps are installed per workspace.

A "remote" is the local CLI's connection to a KovaaLab CRM instance. The standalone CLI stores its server URL and credentials locally. You can configure multiple remotes (e.g. `local`, `staging`, `production`) and switch between them.

The API key authenticates the developer against the target workspace. It determines which workspace the app syncs to, deploys to, and reads data from during development.

## Local Development Environment

Connect to an existing KovaaLab CRM workspace with `kovaa-lab auth login --url <kovaa-lab-instance-url> --name dev`. This opens browser authentication and saves a remote.

For local development, provision a separate KovaaLab CRM server through Docker or the repository's development environment, then authenticate against its URL. The standalone CLI does not start containers.

## App Lifecycle

The development loop is:

```
create → develop → sync → validate → repeat
```

1. **Create**: `kovaa-lab app init <app-name>` generates source files. Then install dependencies with `yarn install`, authenticate with `kovaa-lab auth login`, and explicitly run `kovaa-lab app apply --create` for the first sync.

2. **Develop**: Add or modify entities in `src/`. Objects go in `src/objects/`, front components in `src/front-components/`, logic functions in `src/logic-functions/`, page layouts in `src/page-layouts/`, and so on. Each entity file exports a `define*` call.

3. **Sync**: `kovaa-lab app apply` builds, deploys, and installs the app on the active remote in one step. The KovaaLab CRM instance updates its schema, registers new objects and fields, mounts front components, and activates logic functions. This is the primary way to get changes onto a KovaaLab CRM instance during development. Sync after every meaningful change.

4. **Validate**: `kovaa-lab app typecheck` checks generated types. `yarn lint` checks local lint rules. Open the workspace in a browser to verify front components render and logic functions execute.

## Sharing An App

Publishing is separate from the development loop. It is used to share an app with other KovaaLab CRM instances or the public marketplace:

- `kovaa-lab app publish` publishes to npm for the public marketplace.
- `kovaa-lab app publish --private --remote <name>` publishes privately to a specific KovaaLab CRM instance's registry.

Each publish requires a strictly higher semver version in `package.json`. See the `publish-app` skill for marketplace metadata and listing guidance.

## Front Component Rendering

Front components do not run as a separate frontend application. The KovaaLab CRM workspace renders them inside an isolated Remote DOM container. The SDK mounts the component, provides a `ThemeProvider`, and proxies host APIs (navigation, snackbars, side panels) through `kovaa-lab-sdk/front-component`.

This means:

- Front components cannot access `document` or `window` globals directly.
- They cannot use React portals or third-party libraries that manipulate the DOM outside their tree.
- They import UI primitives from `kovaa-lab-ui` (installed from npm), not from external component libraries.
- They fetch workspace data through `kovaa-lab-client-sdk/core`, not through direct API calls.

For microphone or camera capture, declare `requestedCapabilities: ['microphone']`, `['camera']`, or `['microphone', 'camera']` in `defineApplication()`. These capabilities appear during installation and are separate from role permissions. Approval requires a workspace member who can manage apps and applies to the whole workspace.

Calling `navigator.mediaDevices.getUserMedia()` without a saved grant pauses capture and shows an approval dialog, including for older apps without `requestedCapabilities`. Declining leaves capture blocked before browser permissions are requested. Package updates do not automatically add grants; locally synced development apps receive their declared capabilities. Browser and operating system permissions still apply after workspace approval.

## App File Structure

A typical KovaaLab CRM app after scaffolding:

```
my-app/
  package.json                          # App metadata, version, dependencies
  src/
    application-config.ts               # defineApplication() — app identity and marketplace metadata
    constants/
      universal-identifiers.ts          # Stable UUIDs for all entities
    objects/                            # defineObject, defineField, defineRelation
    views/                              # defineView
    roles/                              # defineRole
    front-components/                   # defineFrontComponent (.tsx)
    settings-menu-items/                      # defineSettingsMenuItem
    page-layouts/                       # definePageLayout
    navigation-menu-items/              # defineNavigationMenuItem
    logic-functions/                    # defineLogicFunction
  public/                               # Static assets (logos, screenshots, images)
  .github/workflows/                    # CI/CD automation (optional)
```

`application-config.ts` is the app's entry point. It calls `defineApplication()` with the app's universal identifier, display name, description, default role, and marketplace metadata. Every entity references stable UUIDs from `constants/universal-identifiers.ts`.

## Key Concepts

- **Universal identifiers**: Stable UUIDs assigned to every entity. They survive renames, version bumps, and resyncs. Never change a universal identifier after first sync.
- **Remotes**: Named connections to KovaaLab CRM instances. Stored in `~/.kovaa-lab/config.json`. Switch with `kovaa-lab remote use <name>`.
- **Sync**: `kovaa-lab app apply` builds, deploys, and installs the app on the active remote in one step. This is the standard way to get code changes onto a KovaaLab CRM instance.
- **Publish**: `kovaa-lab app publish` packages the app for distribution to other instances or the marketplace. Requires a strictly higher semver version than the previously published version.
- **Reserved variable names**: `KOVAALAB_API_URL`, `KOVAALAB_APP_ACCESS_TOKEN`, `KOVAALAB_APP_APPLICATION_ACCESS_TOKEN`, `KOVAALAB_API_KEY`, `KOVAALAB_FUNCTIONS_URL` and `APPLICATION_ID` are set by KovaaLab CRM for every logic function run. A manifest that declares one of them as an application or server variable is rejected on sync and publish.
