import { KOVAALAB_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';

export const getKovaaLabCRMStandardApplicationIdOrThrow = (
  flatApplicationMaps: FlatApplicationCacheMaps,
): string => {
  const kovaaLabStandardApplicationId =
    flatApplicationMaps.idByUniversalIdentifier[
      KOVAALAB_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER
    ];

  if (!isDefined(kovaaLabStandardApplicationId)) {
    throw new ApplicationException(
      'Could not find the kovaa-lab-standard application in the workspace cache',
      ApplicationExceptionCode.APPLICATION_NOT_FOUND,
    );
  }

  return kovaaLabStandardApplicationId;
};
