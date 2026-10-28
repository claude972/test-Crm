#!/usr/bin/env node

console.error(`create-kovaa-lab-app has been retired. Use the standalone KovaaLab CRM CLI:

  npm install -g kovaa-lab
  kovaa-lab app init my-app
  cd my-app
  yarn install
  kovaa-lab auth login --url https://your-workspace.kovaa-lab.com
  kovaa-lab app apply --create

For an existing app, run kovaa-lab app dev from its directory.
Keep kovaa-lab-sdk installed for application definitions and runtime helpers.`);
process.exitCode = 1;
