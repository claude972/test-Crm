import { type LocalCommandDefinition } from '@/catalog/types/command-definition.type';

export const APP_PUBLISH_COMMAND_DEFINITION: LocalCommandDefinition = {
  path: ['app', 'publish'],
  description: 'Build and publish the app to npm or a private KovaaLab CRM registry',
  options: [
    {
      flags: '--private',
      description:
        'Publish to a KovaaLab CRM server registry using --remote or the active target',
    },
    {
      flags: '--path <directory>',
      description:
        'App directory (default: the app containing the current folder)',
    },
    {
      flags: '--tag <tag>',
      description: 'npm dist-tag, for example beta or next',
    },
  ],
  examples: [
    'kovaa-lab app publish',
    'kovaa-lab app publish --private --remote dev',
    'kovaa-lab app publish --path ./apps/billing --tag beta --json',
  ],
  outputModes: ['human', 'json'],
  writes: true,
  needsProject: true,
  needsTarget: false,
  load: async () =>
    (await import('@/commands/app/publish/run-app-publish-command'))
      .runAppPublishCommand,
};
