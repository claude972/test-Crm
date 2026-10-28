# Setup

Use Node.js from `.nvmrc` and Yarn 4. Install the standalone CLI globally:

```bash
npm install -g kovaa-lab
yarn install
```

Connect to your existing KovaaLab CRM workspace, or start a server using the [local-server guide](https://docs.kovaa-lab.com/developers/extend/apps/getting-started/local-server):

```bash
kovaa-lab auth login --url https://your-workspace.kovaa-lab.com --name dev
kovaa-lab app apply --create
kovaa-lab app dev
```

The first apply registers and installs your app. Dev watches and syncs later source changes. `kovaa-lab app init` does not authenticate, start containers, or install the app.

## Validation

- `yarn lint`, lint the project.
- `yarn typecheck`, check source and test types.
- `yarn test:unit`, run unit tests.
- `yarn test`, run integration tests against a disposable workspace configured with `KOVAALAB_API_URL` and `KOVAALAB_API_KEY`.

Integration tests install and uninstall the app. Install the CLI globally or set `KOVAALAB_CLI` to a local executable path.
