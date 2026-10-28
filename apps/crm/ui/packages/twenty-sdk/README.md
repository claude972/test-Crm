<div align="center">
  <a href="https://kovaa-lab.com">
    <picture>
      <img alt="KovaaLab CRM logo" src="https://raw.githubusercontent.com/kovaa-lab/kovaa-lab/main/packages/kovaa-lab-website/public/images/core/logo.svg" height="128">
    </picture>
  </a>
  <h1>KovaaLab CRM SDK</h1>

<a href="https://www.npmjs.com/package/kovaa-lab-sdk"><img alt="NPM version" src="https://img.shields.io/npm/v/kovaa-lab-sdk.svg?style=for-the-badge&labelColor=000000"></a>
<a href="https://github.com/kovaa-lab/kovaa-lab/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/npm/l/next.svg?style=for-the-badge&labelColor=000000"></a>
<a href="https://discord.gg/cx5n4Jzs57"><img alt="Join the community on Discord" src="https://img.shields.io/badge/Join%20the%20community-blueviolet.svg?style=for-the-badge&logo=KovaaLab CRM&labelColor=000000&logoWidth=20"></a>

</div>

The application authoring and runtime SDK for [KovaaLab CRM CRM](https://kovaa-lab.com).

Use `kovaa-lab-sdk/define` to declare app entities, `kovaa-lab-sdk/front-component` for UI helpers, and `kovaa-lab-sdk/logic-function` for server-side helpers. The SDK also provides `billing`, `utils`, and renderer integration exports.

## Quick start

Install the standalone CLI separately from your app's SDK:

```bash
npm install -g kovaa-lab
kovaa-lab app init my-kovaa-lab-app
cd my-kovaa-lab-app
yarn install
kovaa-lab auth login --url https://your-workspace.kovaa-lab.com
kovaa-lab app dev --create
```

Keep `kovaa-lab-sdk` installed in each app. The global `kovaa-lab` package owns scaffolding, builds, authentication, sync, and publishing.

## Documentation

- [CLI reference](https://docs.kovaa-lab.com/developers/extend/apps/operations/cli)
- [Testing apps](https://docs.kovaa-lab.com/developers/extend/apps/operations/testing)
- [Logic function inputs](./docs/logic-function-inputs.md)

## Contributing

```bash
yarn install
npx nx build kovaa-lab-sdk
npx nx run kovaa-lab-sdk:test:unit
```

To work on CLI behavior, use `packages/kovaa-lab-cli` and `npx nx build kovaa-lab-cli`.
