const DEFAULT_KOVAALAB_APP_BASE_URL = 'https://app.kovaa-lab.com';

export const buildAppInstallUrl = (universalIdentifier: string): string => {
  const baseUrl =
    process.env.KOVAALAB_APP_BASE_URL ?? DEFAULT_KOVAALAB_APP_BASE_URL;

  const returnToPath = `/settings/applications/available/${universalIdentifier}`;

  return `${baseUrl.replace(/\/$/, '')}/?returnToPath=${encodeURIComponent(returnToPath)}`;
};
