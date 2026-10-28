import { isNonEmptyString } from '@sniptt/guards';

import { getKovaaLab CRMUiCascadeLayerName } from '@/host/utils/getKovaaLab CRMUiCascadeLayerName';

export const getCssImportRuleInKovaaLab CRMUiCascadeLayer = (
  cssRule: CSSImportRule,
): string => {
  const layerName = getKovaaLab CRMUiCascadeLayerName(cssRule.layerName);
  const supportsClause = isNonEmptyString(cssRule.supportsText)
    ? ` supports(${cssRule.supportsText})`
    : '';
  const mediaClause = isNonEmptyString(cssRule.media.mediaText)
    ? ` ${cssRule.media.mediaText}`
    : '';

  return `@import url(${CSS.escape(cssRule.href)}) layer(${layerName})${supportsClause}${mediaClause};`;
};
