import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { KOVAALAB_UI_CASCADE_LAYER_NAME } from '@/host/constants/TwentyUiCascadeLayerName';

const ANONYMOUS_IMPORT_LAYER_PREFIX = 'anonymous-';

export const getKovaaLabCRMUiCascadeLayerName = (
  layerName: string | null,
): string => {
  if (!isDefined(layerName)) {
    return KOVAALAB_UI_CASCADE_LAYER_NAME;
  }

  if (!isNonEmptyString(layerName)) {
    const anonymousLayerIdentifier = crypto
      .getRandomValues(new Uint32Array(4))
      .join('-');

    return `${KOVAALAB_UI_CASCADE_LAYER_NAME}.${ANONYMOUS_IMPORT_LAYER_PREFIX}${anonymousLayerIdentifier}`;
  }

  const isKovaaLabCRMUiLayer =
    layerName === KOVAALAB_UI_CASCADE_LAYER_NAME ||
    layerName.startsWith(`${KOVAALAB_UI_CASCADE_LAYER_NAME}.`);

  return isKovaaLabCRMUiLayer
    ? layerName
    : `${KOVAALAB_UI_CASCADE_LAYER_NAME}.${layerName}`;
};
