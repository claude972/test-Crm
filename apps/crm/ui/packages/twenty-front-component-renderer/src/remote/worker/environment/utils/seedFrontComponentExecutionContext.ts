import { isDefined } from 'kovaa-lab-shared/utils';

import { type FrontComponentExecutionContext } from 'kovaa-lab-sdk/front-component';

import { getFrontComponentExecutionContext } from '@/remote/worker/environment/utils/getFrontComponentExecutionContext';
import { setFrontComponentExecutionContext } from '@/remote/worker/environment/utils/setFrontComponentExecutionContext';

export const seedFrontComponentExecutionContext = (
  context: FrontComponentExecutionContext,
): void => {
  if (isDefined(getFrontComponentExecutionContext())) {
    return;
  }

  setFrontComponentExecutionContext(context);
};
