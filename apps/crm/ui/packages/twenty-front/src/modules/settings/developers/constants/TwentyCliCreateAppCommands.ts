import { doNotTranslate } from 'kovaa-lab-shared/i18n';

// A bare `npx kovaa-lab` would run the deprecated binary from the app's kovaa-lab-sdk
export const KOVAALAB_CLI_CREATE_APP_COMMANDS = doNotTranslate([
  'npx kovaa-lab@latest app init my-app',
  'cd my-app',
  'yarn install',
  'npx kovaa-lab@latest app apply --create',
  'npx kovaa-lab@latest app dev',
]);
