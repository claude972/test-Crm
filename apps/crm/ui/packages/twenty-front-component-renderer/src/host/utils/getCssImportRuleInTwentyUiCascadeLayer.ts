import { isNonEmptyString } from '@sniptt/guards';

import { getKovaaLabCRMUiCascadeLayerName } from '@/host/utils/getTwentyUiCascadeLayerName';

export const getCssImportRuleInKovaaLabCRMUiCascadeLayer = (
  cssRule: CSSImportRule,
): string => {
  const layerName = getKovaaLabCRMUiCascadeLayerName(cssRule.layerName);
  const supportsClause = isNonEmptyString(cssRule.supportsText)
    ? ` supports(${cssRule.supportsText})`
    : '';
  const mediaClause = isNonEmptyString(cssRule.media.mediaText)
    ? ` ${cssRule.media.mediaText}`
    : '';

  return `@import url(${CSS.escape(cssRule.href)}) layer(${layerName})${supportsClause}${mediaClause};`;
};
