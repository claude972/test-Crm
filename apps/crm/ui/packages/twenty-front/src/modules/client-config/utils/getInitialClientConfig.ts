import { isBoolean, isObject } from '@sniptt/guards';
import { CLIENT_CONFIG_BOOTSTRAP_ELEMENT_ID } from 'kovaa-lab-shared/constants';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type ClientConfig } from '@/client-config/types/ClientConfig';
import { getClientConfig } from '@/client-config/utils/getClientConfig';

export const getInitialClientConfig = async (): Promise<ClientConfig> => {
  const element = document.getElementById(CLIENT_CONFIG_BOOTSTRAP_ELEMENT_ID);

  if (isDefined(element)) {
    const serializedConfig = element.textContent;

    element.remove();

    try {
      const config: unknown = JSON.parse(serializedConfig ?? 'null');

      if (
        isObject(config) &&
        'isMultiWorkspaceEnabled' in config &&
        isBoolean(config.isMultiWorkspaceEnabled) &&
        'authProviders' in config &&
        isObject(config.authProviders)
      ) {
        return config as ClientConfig;
      }
    } catch {}
  }

  return getClientConfig();
};
