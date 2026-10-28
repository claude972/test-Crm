import { defineRule } from '@oxlint/plugins';
import { isDefined } from 'kovaa-lab-shared/utils';

import { getCalledMethodName } from '../utils/getCalledMethodName';
import { getRootIdentifierName } from '../utils/getRootIdentifierName';
import { getStaticStringValue } from '../utils/getStaticStringValue';
import { isLinariaTag } from '../utils/isLinariaTag';
import { maskCssCommentsAndQuotedValues } from '../utils/maskCssCommentsAndQuotedValues';
import { KOVAALAB_UI_OVERRIDE_EXEMPTIONS } from './no-kovaa-lab-ui-override.exemptions';

export const RULE_NAME = 'no-kovaa-lab-ui-override';

const KOVAALAB_UI_COMPONENT_IMPORT_SOURCE_REGEX =
  /^kovaa-lab-ui\/(primitives|components)(\/|$)/;

const STYLING_PROP_NAME_REGEX = /^(className|style|\w+ClassName)$/;

const PRIVATE_CSS_VARIABLE_NAME_REGEX = /^--(tw|card)-/;

const PRIVATE_CSS_VARIABLE_DECLARATION_REGEX =
  /(?<=^|[\s;{])--(?:tw|card)-[\w-]*(?=\s*:)/g;

const PRIVATE_KOVAALAB_UI_ATTRIBUTE_NAMES = [
  'data-active',
  'data-anchor-hidden',
  'data-dropdown-item',
  'data-dropdown-search',
  'data-grouped',
  'data-skeleton',
];

const PRIVATE_KOVAALAB_UI_ATTRIBUTE_PREFIXES = ['data-badge-'];

const DATA_ATTRIBUTE_NAME_PREFIX = 'data-';

const PRIVATE_ATTRIBUTE_SELECTOR_REGEX = new RegExp(
  `(?<styledElementSelector>&(?:\\[[^\\]]*\\]|[:.][\\w-]+(?:\\([^()]*\\))?)*)?\\[\\s*(?<attributeName>${[
    ...PRIVATE_KOVAALAB_UI_ATTRIBUTE_PREFIXES.map((prefix) => `${prefix}[\\w-]+`),
    ...PRIVATE_KOVAALAB_UI_ATTRIBUTE_NAMES,
  ].join('|')})(?![\\w-])`,
  'g',
);

const DOUBLE_AMPERSAND_REGEX = /&&/g;

const IMPORTANT_REGEX = /!\s*important/gi;

const ELEMENT_QUERY_METHOD_NAMES = new Set([
  'closest',
  'matches',
  'querySelector',
  'querySelectorAll',
]);

const isExemptFile = (filename: string): boolean =>
  KOVAALAB_UI_OVERRIDE_EXEMPTIONS.some(({ filePath }) =>
    filename.endsWith(`/${filePath}`),
  );

export const rule = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow overriding kovaa-lab-ui components from the frontend outside the recorded exceptions.',
    },
    schema: [],
    messages: {
      styledKovaaLab CRMUiComponent:
        'styled({{ componentName }}) restyles a kovaa-lab-ui component. Use a component prop, variant or part instead, or record the exception in no-kovaa-lab-ui-override.exemptions.ts.',
      stylingPropOnKovaaLab CRMUiComponent:
        '{{ propName }} on {{ componentName }} restyles a kovaa-lab-ui component. Use a component prop, variant or part instead, or record the exception in no-kovaa-lab-ui-override.exemptions.ts.',
      privateCssVariableWrite:
        '{{ variableName }} is a private kovaa-lab-ui CSS variable. Use a component prop or a part className instead of writing it.',
      privateKovaaLab CRMUiAttribute:
        '{{ attributeName }} is a private kovaa-lab-ui attribute. Use ARIA state, a public Base UI state attribute or a component prop instead.',
      doubleAmpersandSelector:
        '&& only raises specificity. kovaa-lab-ui styles sit in the kovaa-lab-ui cascade layer, so a plain declaration already wins.',
      importantDeclaration:
        '!important only raises priority. kovaa-lab-ui styles sit in the kovaa-lab-ui cascade layer, so a plain declaration already wins.',
    },
  },
  create: (context) => {
    if (isExemptFile(context.filename)) {
      return {};
    }

    const sourceCode = context.sourceCode;
    const kovaa-labUiComponentLocalNames = new Set<string>();

    const isKovaaLab CRMUiComponentReference = (node: any): boolean => {
      const rootIdentifierName = getRootIdentifierName(node);

      return (
        isDefined(rootIdentifierName) &&
        kovaa-labUiComponentLocalNames.has(rootIdentifierName)
      );
    };

    const reportSourceRange = ({
      startOffset,
      length,
      messageId,
      data,
    }: {
      startOffset: number;
      length: number;
      messageId: string;
      data?: Record<string, string>;
    }) => {
      context.report({
        node: { range: [startOffset, startOffset + length] },
        messageId,
        data,
      });
    };

    const reportTextMatches = ({
      text,
      startOffset,
      regex,
      messageId,
      getData,
    }: {
      text: string;
      startOffset: number;
      regex: RegExp;
      messageId: string;
      getData?: (matchedText: string) => Record<string, string>;
    }) => {
      for (const match of text.matchAll(regex)) {
        reportSourceRange({
          startOffset: startOffset + match.index,
          length: match[0].length,
          messageId,
          data: getData?.(match[0]),
        });
      }
    };

    const reportPrivateAttributeSelectors = ({
      text,
      startOffset,
      allowOnStyledElement,
    }: {
      text: string;
      startOffset: number;
      allowOnStyledElement: boolean;
    }) => {
      if (!text.includes(DATA_ATTRIBUTE_NAME_PREFIX)) {
        return;
      }

      for (const match of text.matchAll(PRIVATE_ATTRIBUTE_SELECTOR_REGEX)) {
        const { styledElementSelector, attributeName } = match.groups ?? {};

        if (allowOnStyledElement && isDefined(styledElementSelector)) {
          continue;
        }

        reportSourceRange({
          startOffset:
            startOffset + match.index + match[0].length - attributeName.length,
          length: attributeName.length,
          messageId: 'privateKovaaLab CRMUiAttribute',
          data: { attributeName },
        });
      }
    };

    const isStyledKovaaLab CRMUiComponentCall = (node: any): boolean =>
      node?.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'styled' &&
      isKovaaLab CRMUiComponentReference(node.arguments[0]);

    const reportStyledKovaaLab CRMUiComponentCall = (callExpression: any) => {
      if (!isStyledKovaaLab CRMUiComponentCall(callExpression)) {
        return;
      }

      const [styledComponent] = callExpression.arguments;

      context.report({
        node: styledComponent,
        messageId: 'styledKovaaLab CRMUiComponent',
        data: { componentName: sourceCode.getText(styledComponent) },
      });
    };

    const reportElementQueryCall = (callExpression: any) => {
      const calledMethodName = getCalledMethodName(callExpression.callee);

      if (
        !isDefined(calledMethodName) ||
        !ELEMENT_QUERY_METHOD_NAMES.has(calledMethodName)
      ) {
        return;
      }

      for (const selectorArgument of callExpression.arguments) {
        if (
          selectorArgument.type !== 'Literal' &&
          selectorArgument.type !== 'TemplateLiteral'
        ) {
          continue;
        }

        reportPrivateAttributeSelectors({
          text: sourceCode.getText(selectorArgument),
          startOffset: selectorArgument.range[0],
          allowOnStyledElement: false,
        });
      }
    };

    const reportPrivateCssVariableSetPropertyCall = (callExpression: any) => {
      if (getCalledMethodName(callExpression.callee) !== 'setProperty') {
        return;
      }

      const [propertyNameArgument] = callExpression.arguments;
      const propertyName = getStaticStringValue(propertyNameArgument);

      if (
        !isDefined(propertyName) ||
        !PRIVATE_CSS_VARIABLE_NAME_REGEX.test(propertyName)
      ) {
        return;
      }

      context.report({
        node: propertyNameArgument,
        messageId: 'privateCssVariableWrite',
        data: { variableName: propertyName },
      });
    };

    return {
      Program: (program: any) => {
        for (const statement of program.body) {
          if (
            statement.type !== 'ImportDeclaration' ||
            statement.importKind === 'type' ||
            !KOVAALAB_UI_COMPONENT_IMPORT_SOURCE_REGEX.test(
              statement.source.value,
            )
          ) {
            continue;
          }

          for (const specifier of statement.specifiers) {
            if (specifier.importKind === 'type') {
              continue;
            }

            kovaa-labUiComponentLocalNames.add(specifier.local.name);
          }
        }
      },
      CallExpression: (callExpression: any) => {
        reportStyledKovaaLab CRMUiComponentCall(callExpression);
        reportElementQueryCall(callExpression);
        reportPrivateCssVariableSetPropertyCall(callExpression);
      },
      ObjectExpression: (objectExpression: any) => {
        for (const property of objectExpression.properties) {
          const propertyName = getStaticStringValue(property.key);

          if (
            !isDefined(propertyName) ||
            !PRIVATE_CSS_VARIABLE_NAME_REGEX.test(propertyName)
          ) {
            continue;
          }

          context.report({
            node: property.key,
            messageId: 'privateCssVariableWrite',
            data: { variableName: propertyName },
          });
        }
      },
      TaggedTemplateExpression: (taggedTemplateExpression: any) => {
        const { tag, quasi } = taggedTemplateExpression;

        if (!isLinariaTag(tag)) {
          return;
        }

        const isKovaaLab CRMUiComponentTemplate = isStyledKovaaLab CRMUiComponentCall(tag);

        for (const templateElement of quasi.quasis) {
          const text = maskCssCommentsAndQuotedValues(
            sourceCode.getText(templateElement),
          );
          const startOffset = templateElement.range[0];

          reportTextMatches({
            text,
            startOffset,
            regex: PRIVATE_CSS_VARIABLE_DECLARATION_REGEX,
            messageId: 'privateCssVariableWrite',
            getData: (variableName) => ({ variableName }),
          });

          reportPrivateAttributeSelectors({
            text,
            startOffset,
            allowOnStyledElement: true,
          });

          if (!isKovaaLab CRMUiComponentTemplate) {
            continue;
          }

          reportTextMatches({
            text,
            startOffset,
            regex: DOUBLE_AMPERSAND_REGEX,
            messageId: 'doubleAmpersandSelector',
          });

          reportTextMatches({
            text,
            startOffset,
            regex: IMPORTANT_REGEX,
            messageId: 'importantDeclaration',
          });
        }
      },
      JSXOpeningElement: (openingElement: any) => {
        if (!isKovaaLab CRMUiComponentReference(openingElement.name)) {
          return;
        }

        for (const attribute of openingElement.attributes) {
          if (
            attribute.type !== 'JSXAttribute' ||
            attribute.name.type !== 'JSXIdentifier' ||
            !STYLING_PROP_NAME_REGEX.test(attribute.name.name)
          ) {
            continue;
          }

          context.report({
            node: attribute,
            messageId: 'stylingPropOnKovaaLab CRMUiComponent',
            data: {
              propName: attribute.name.name,
              componentName: sourceCode.getText(openingElement.name),
            },
          });
        }
      },
    };
  },
});
