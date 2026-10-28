import { isDefined } from 'kovaa-lab-shared/utils';

import { type Application } from '~/generated-metadata/graphql';

export const applicationHasHttpTriggeredFunctions = (
  application?: Pick<Application, 'logicFunctions'>,
): boolean =>
  (application?.logicFunctions ?? []).some((logicFunction) =>
    isDefined(logicFunction.httpRouteTriggerSettings),
  );
