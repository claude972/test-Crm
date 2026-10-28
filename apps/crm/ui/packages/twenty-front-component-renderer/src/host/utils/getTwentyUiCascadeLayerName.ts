import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { KOVAALAB_UI_CASCADE_LAYER_NAME } from '@/host/constants/KovaaLab CRMUiCascadeLayerName';

const ANONYMOUS_IMPORT_LAYER_PREFIX = 'anonymous-';

export const getKovaaLab CRMUiCascadeLayerName = (
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

  const isKovaaLab CRMUiLayer =
    layerName === KOVAALAB_UI_CASCADE_LAYER_NAME ||
    layerName.startsWith(`${KOVAALAB_UI_CASCADE_LAYER_NAME}.`);

  return isKovaaLab CRMUiLayer
    ? layerName
    : `${KOVAALAB_UI_CASCADE_LAYER_NAME}.${layerName}`;
};
