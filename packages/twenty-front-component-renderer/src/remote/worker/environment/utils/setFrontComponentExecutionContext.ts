import { type FrontComponentExecutionContext } from 'kovaa-lab-sdk/front-component';

import { FRONT_COMPONENT_CONTEXT_KEY } from 'kovaa-lab-sdk/front-component-renderer';
import { isDefined } from 'kovaa-lab-shared/utils';

import { toGlobalScopeRecord } from '@/polyfills/utils/toGlobalScopeRecord';
import { getFrontComponentExecutionContext } from '@/remote/worker/environment/utils/getFrontComponentExecutionContext';
import { getFrontComponentExecutionContextListeners } from '@/remote/worker/environment/utils/getFrontComponentExecutionContextListeners';
import { reuseUnchangedExecutionContextValues } from '@/remote/worker/environment/utils/reuseUnchangedExecutionContextValues';

export const setFrontComponentExecutionContext = (
  context: FrontComponentExecutionContext,
): void => {
  const previousContext = getFrontComponentExecutionContext();

  toGlobalScopeRecord(globalThis)[FRONT_COMPONENT_CONTEXT_KEY] = isDefined(
    previousContext,
  )
    ? reuseUnchangedExecutionContextValues({
        previousExecutionContext: previousContext,
        nextExecutionContext: context,
      })
    : context;

  for (const listener of getFrontComponentExecutionContextListeners()) {
    listener();
  }
};
