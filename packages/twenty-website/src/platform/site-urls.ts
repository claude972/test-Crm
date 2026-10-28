// Sections and data files never inline external URLs.
export const SITE_URLS: Record<
  | 'appWelcome'
  | 'calBooking'
  | 'discord'
  | 'docsApi'
  | 'docsDevelopers'
  | 'docsGettingStarted'
  | 'docsMcp'
  | 'docsSelfHost'
  | 'docsSelfHostLicense'
  | 'docsUserGuide'
  | 'github'
  | 'githubIssues'
  | 'linkedin'
  | 'trustCenter'
  | 'x',
  string
> = {
  appWelcome: 'https://app.kovaa-lab.com/welcome',
  calBooking: 'https://cal.com/forms/f7841033-0a20-4958-8c92-4e34ec128a81',
  discord: 'https://discord.gg/cx5n4Jzs57',
  docsApi: 'https://docs.kovaa-lab.com/developers/extend/api',
  docsDevelopers: 'https://docs.kovaa-lab.com/developers/introduction',
  docsGettingStarted: 'https://docs.kovaa-lab.com/getting-started/introduction',
  docsMcp: 'https://docs.kovaa-lab.com/user-guide/ai/capabilities/mcp',
  docsSelfHost:
    'https://docs.kovaa-lab.com/developers/self-host/capabilities/docker-compose',
  docsSelfHostLicense:
    'https://docs.kovaa-lab.com/user-guide/billing/capabilities/pricing-plans#get-an-organization-key',
  docsUserGuide: 'https://docs.kovaa-lab.com/user-guide/introduction',
  github: 'https://github.com/kovaa-lab/kovaa-lab',
  githubIssues: 'https://github.com/kovaa-lab/kovaa-lab/issues',
  linkedin: 'https://www.linkedin.com/company/kovaa-lab',
  trustCenter: 'https://trust.kovaa-lab.com',
  x: 'https://x.com/kovaa-labcrm',
};
