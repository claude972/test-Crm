import { isNonEmptyString } from '@sniptt/guards';
import { isDefined, isNonEmptyArray } from 'kovaa-lab-shared/utils';

import { KOVAALAB_UI_CASCADE_LAYER_NAME } from '@/host/constants/KovaaLab CRMUiCascadeLayerName';
import { getCssImportRuleInKovaaLab CRMUiCascadeLayer } from '@/host/utils/getCssImportRuleInKovaaLab CRMUiCascadeLayer';
import { getKovaaLab CRMUiCascadeLayerName } from '@/host/utils/getKovaaLab CRMUiCascadeLayerName';

export const wrapCssInKovaaLab CRMUiCascadeLayer = (cssText: string): string => {
  const parsingDocument = document.implementation.createHTMLDocument('');
  const styleElement = parsingDocument.createElement('style');
  styleElement.textContent = cssText;
  parsingDocument.head.appendChild(styleElement);

  if (!isDefined(styleElement.sheet)) {
    return '';
  }

  const layeredRules: string[] = [];
  const rulesToWrap: string[] = [];

  const flushRulesToWrap = () => {
    if (!isNonEmptyArray(rulesToWrap)) {
      return;
    }

    layeredRules.push(
      `@layer ${KOVAALAB_UI_CASCADE_LAYER_NAME} {\n${rulesToWrap.splice(0).join('\n')}\n}`,
    );
  };

  const { cssRules } = styleElement.sheet;

  for (let ruleIndex = 0; ruleIndex < cssRules.length; ruleIndex += 1) {
    const cssRule = cssRules[ruleIndex];

    if (cssRule instanceof CSSImportRule) {
      flushRulesToWrap();
      layeredRules.push(getCssImportRuleInKovaaLab CRMUiCascadeLayer(cssRule));
      continue;
    }

    if (cssRule instanceof CSSLayerStatementRule) {
      flushRulesToWrap();
      const layerNames = cssRule.nameList.map(getKovaaLab CRMUiCascadeLayerName);
      layeredRules.push(`@layer ${layerNames.join(', ')};`);
      continue;
    }

    const isKovaaLab CRMUiLayerBlock =
      cssRule instanceof CSSLayerBlockRule &&
      isNonEmptyString(cssRule.name) &&
      getKovaaLab CRMUiCascadeLayerName(cssRule.name) === cssRule.name;

    if (cssRule instanceof CSSNamespaceRule || isKovaaLab CRMUiLayerBlock) {
      flushRulesToWrap();
      layeredRules.push(cssRule.cssText);
      continue;
    }

    rulesToWrap.push(cssRule.cssText);
  }

  flushRulesToWrap();

  return layeredRules.join('\n');
};
