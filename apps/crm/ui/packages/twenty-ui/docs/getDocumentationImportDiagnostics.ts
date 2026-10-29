import ts from 'typescript';

const isTwentyUiModule = (specifier: string): boolean =>
  specifier === 'kovaa-lab-ui' || specifier.startsWith('kovaa-lab-ui/');

const describeDisallowedModule = (specifier: string): string =>
  isTwentyUiModule(specifier)
    ? `${specifier} is not exported by kovaa-lab-ui/package.json.`
    : `${specifier} is not a kovaa-lab-ui entry point or peer dependency. Documentation examples can only import those.`;

export const getDocumentationImportDiagnostics = ({
  source,
  allowedModules,
}: {
  source: ts.SourceFile;
  allowedModules: ReadonlySet<string>;
}): ts.Diagnostic[] => {
  const diagnostics: ts.Diagnostic[] = [];

  const visit = (node: ts.Node) => {
    let specifier: ts.Node | undefined;

    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      specifier = node.arguments[0];
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      specifier = node.argument.literal;
    }

    if (
      specifier &&
      ts.isStringLiteralLike(specifier) &&
      !allowedModules.has(specifier.text)
    ) {
      diagnostics.push({
        category: ts.DiagnosticCategory.Error,
        code: 95000,
        file: source,
        start: specifier.getStart(source),
        length: specifier.getWidth(source),
        messageText: describeDisallowedModule(specifier.text),
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return diagnostics;
};
