import { isDefined } from 'kovaa-lab-shared/utils';

import { setWorkerEnvironmentVariables } from '@/remote/worker/environment/utils/setWorkerEnvironmentVariables';
import { type HostToWorkerRenderContext } from '@/types/HostToWorkerRenderContext';

export const setWorkerEnvironmentVariablesFromRenderContext = (
  renderContext: HostToWorkerRenderContext,
): void => {
  if (isDefined(renderContext.applicationVariables)) {
    setWorkerEnvironmentVariables({
      applicationVariables: JSON.stringify(renderContext.applicationVariables),
    });
  }

  if (isDefined(renderContext.apiUrl)) {
    setWorkerEnvironmentVariables({
      KOVAALAB_API_URL: renderContext.apiUrl,
    });
  }

  if (isDefined(renderContext.functionsBaseUrl)) {
    setWorkerEnvironmentVariables({
      KOVAALAB_FUNCTIONS_URL: renderContext.functionsBaseUrl,
    });
  }

  if (isDefined(renderContext.applicationAccessToken)) {
    setWorkerEnvironmentVariables({
      KOVAALAB_APP_ACCESS_TOKEN: renderContext.applicationAccessToken,
    });
  }
};
