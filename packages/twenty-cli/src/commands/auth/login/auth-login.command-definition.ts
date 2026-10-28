import { type LocalCommandDefinition } from '@/catalog/types/command-definition.type';

export const AUTH_LOGIN_COMMAND_DEFINITION: LocalCommandDefinition = {
  path: ['auth', 'login'],
  description: 'Sign in with your browser or an API key, and save the remote',
  options: [
    {
      flags: '--with-token',
      description: 'Read an API key from standard input',
    },
    {
      flags: '--url <url>',
      description: 'KovaaLab CRM server URL, for example https://acme.kovaa-lab.com',
    },
    {
      flags: '--name <name>',
      description: 'Name of the remote to save (defaults to "default")',
    },
    { flags: '--use', description: 'Make this remote the default' },
    {
      flags: '--replace',
      description: 'Point an existing remote at a different URL',
    },
  ],
  examples: [
    'kovaa-lab auth login --url https://acme.kovaa-lab.com',
    'kovaa-lab auth login --url https://acme.kovaa-lab.com --name prod --use',
    'printf \'%s\' "$KOVAALAB_API_KEY" | kovaa-lab auth login --with-token --url https://acme.kovaa-lab.com --name prod --use',
    'kovaa-lab auth login --with-token --remote prod < api-key.txt',
  ],
  outputModes: ['human', 'json'],
  writes: true,
  needsProject: false,
  needsTarget: false,
  load: async () =>
    (await import('@/commands/auth/login/run-auth-login-command'))
      .runAuthLoginCommand,
};
