import { isNonEmptyString } from '@sniptt/guards';
import { isDefined, isNonEmptyArray } from 'kovaa-lab-shared/utils';

import { KOVAALAB_UI_CASCADE_LAYER_NAME } from '@/host/constants/TwentyUiCascadeLayerName';
import { getCssImportRuleInKovaaLabCRMUiCascadeLayer } from '@/host/utils/getCssImportRuleInTwentyUiCascadeLayer';
import { getKovaaLabCRMUiCascadeLayerName } from '@/host/utils/getTwentyUiCascadeLayerName';

export const wrapCssInKovaaLabCRMUiCascadeLayer = (cssText: string): string => {
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
      layeredRules.push(getCssImportRuleInKovaaLabCRMUiCascadeLayer(cssRule));
      continue;
    }

    if (cssRule instanceof CSSLayerStatementRule) {
      flushRulesToWrap();
      const layerNames = cssRule.nameList.map(getKovaaLabCRMUiCascadeLayerName);
      layeredRules.push(`@layer ${layerNames.join(', ')};`);
      continue;
    }

    const isKovaaLabCRMUiLayerBlock =
      cssRule instanceof CSSLayerBlockRule &&
      isNonEmptyString(cssRule.name) &&
      getKovaaLabCRMUiCascadeLayerName(cssRule.name) === cssRule.name;

    if (cssRule instanceof CSSNamespaceRule || isKovaaLabCRMUiLayerBlock) {
      flushRulesToWrap();
      layeredRules.push(cssRule.cssText);
      continue;
    }

    rulesToWrap.push(cssRule.cssText);
  }

  flushRulesToWrap();

  return layeredRules.join('\n');
};
