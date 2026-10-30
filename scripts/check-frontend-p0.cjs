// Frontend P0 controller. Owned by Claude per MISSIONS.md / p0-frontend-baseline.
// Deliberately separate from scripts/check-crm-p0.cjs, which stays Codex's and
// covers twenty-server and twenty-shared only.
//
// Parsing and module resolution only: no typecheck, no bundling, no service.
// Asset specifiers are resolved against the filesystem instead of through
// ts.resolveModuleName, which cannot see Vite's loaders and would otherwise
// report every .svg/.png import as a failure.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, statSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dependencyRequire = process.env.HERMES_CHECK_MODULES
  ? createRequire(path.resolve(process.env.HERMES_CHECK_MODULES, 'package.json'))
  : require;
const ts = dependencyRequire('typescript');
const workspace = path.join(root, 'apps/crm/ui');
const packages = (process.env.FRONTEND_P0_PACKAGES ?? 'twenty-front,twenty-front-component-renderer').split(',');

// Vite resolves these; TypeScript cannot. Checked on disk instead.
const ASSET_EXTENSIONS = /\.(?:svg|png|jpe?g|gif|webp|avif|ico|css|scss|woff2?|ttf|otf|mp4|webm|wasm|md|txt|csv|html)$/;
// A Vite query can carry several flags, as in '?worker&inline'. Strip all of it.
const VITE_QUERY = /\?.*$/;

const failures = [];
let parsed = 0;
let importsChecked = 0;
let assetsChecked = 0;
let identifierHits = 0;

// A display string may legitimately contain the brand with a space. An
// identifier may not: that is the P0 defect this controller exists to catch.
const SPACED_BRAND_IN_IDENTIFIER = /(?:[A-Za-z0-9_$]KovaaLab CRM|KovaaLab CRM[A-Za-z0-9_$])/;

const listSources = (packageName) =>
  execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard', `apps/crm/ui/packages/${packageName}`],
    { cwd: root, maxBuffer: 64 * 1024 * 1024 },
  )
    .toString()
    .split('\0')
    .filter(
      (file) =>
        /\.(?:ts|tsx|mts|cts)$/.test(file) && !file.includes('/locales/'),
    );

// The icon entry point re-exports a nominative list. A name that lives only in
// icon/providers/internal/AllIcons.ts feeds the runtime registry and is NOT
// re-exported, so importing it yields undefined and crashes the screen on
// render. ts.resolveModuleName below resolves the MODULE, never the binding,
// so this whole class of defect was invisible to the import check — it reached
// production code once already.
const ICON_ENTRY_POINT = 'kovaa-lab-ui/icon';
const ICON_ENTRY_SOURCE = path.join(
  workspace,
  'packages/twenty-ui/src/icon/index.ts',
);

const readIconExports = () => {
  if (!existsSync(ICON_ENTRY_SOURCE)) return null;

  const source = ts.createSourceFile(
    ICON_ENTRY_SOURCE,
    readFileSync(ICON_ENTRY_SOURCE, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const names = new Set();
  const visit = (node) => {
    if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const element of node.exportClause.elements) {
        names.add(element.name.text);
      }
    }
    // A star re-export would make this set incomplete and turn the check into
    // a source of false failures, so refuse to guess instead.
    if (ts.isExportDeclaration(node) && !node.exportClause) {
      names.add(null);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  if (names.has(null)) return null;

  return names.size > 0 ? names : null;
};

const iconExports = readIconExports();
let iconImportsChecked = 0;

const resolveAsset = (specifier, importer) => {
  const bare = specifier.replace(VITE_QUERY, '');
  if (bare.startsWith('.')) {
    return existsSync(path.resolve(path.dirname(importer), bare));
  }
  // '@/x' maps to <package>/src/modules/x, '~/x' to <package>/src/x.
  const packageRoot = importer.slice(0, importer.indexOf(`${path.sep}src${path.sep}`));
  if (bare.startsWith('@/')) {
    return existsSync(path.join(packageRoot, 'src/modules', bare.slice(2)));
  }
  if (bare.startsWith('~/')) {
    return existsSync(path.join(packageRoot, 'src', bare.slice(2)));
  }
  if (bare.startsWith('@assets/')) {
    return existsSync(path.join(packageRoot, 'src/assets', bare.slice(8)));
  }
  return null; // out of scope: external package asset
};

for (const packageName of packages) {
  const packageRoot = path.join(workspace, 'packages', packageName);
  if (!existsSync(packageRoot)) continue;
  const configPath = path.join(packageRoot, 'tsconfig.json');
  assert.ok(existsSync(configPath), `${configPath}: missing`);
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined, `${configPath}: invalid configuration`);
  const options = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    packageRoot,
  ).options;

  for (const file of listSources(packageName)) {
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) continue;
    const text = readFileSync(absolute, 'utf8');
    const source = ts.createSourceFile(
      absolute,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    parsed += 1;

    for (const diagnostic of source.parseDiagnostics) {
      const { line, character } = source.getLineAndCharacterOfPosition(
        diagnostic.start,
      );
      failures.push(
        `${file}:${line + 1}:${character + 1}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`,
      );
    }

    if (SPACED_BRAND_IN_IDENTIFIER.test(text)) {
      identifierHits += 1;
      failures.push(
        `${file}: brand string with a space inside an identifier; use KovaaLabCRM, or the name the provider exports`,
      );
    }

    for (const statement of source.statements) {
      if (
        !(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))
      )
        continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      const name = specifier.text;

      if (name === ICON_ENTRY_POINT && iconExports !== null) {
        const namedBindings = statement.importClause?.namedBindings;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
          for (const element of namedBindings.elements) {
            const imported = (element.propertyName ?? element.name).text;
            iconImportsChecked += 1;
            if (!iconExports.has(imported)) {
              failures.push(
                `${file}: ${imported} is not exported from ${ICON_ENTRY_POINT}; it may exist only in the internal icon registry`,
              );
            }
          }
        }
      }

      if (
        !name.startsWith('.') &&
        !name.startsWith('@/') &&
        !name.startsWith('~/') &&
        !name.startsWith('@assets/') &&
        !name.startsWith('src/')
      )
        continue;

      if (ASSET_EXTENSIONS.test(name.replace(VITE_QUERY, ''))) {
        const found = resolveAsset(name, absolute);
        if (found === null) continue;
        assetsChecked += 1;
        if (!found) failures.push(`${file}: missing asset ${name}`);
        continue;
      }

      importsChecked += 1;
      const resolved = ts.resolveModuleName(
        name.replace(VITE_QUERY, ''),
        absolute,
        options,
        ts.sys,
      ).resolvedModule;
      if (!resolved) failures.push(`${file}: unresolved internal import ${name}`);
    }
  }
}

for (const failure of failures.slice(0, 60)) console.error(failure);
if (failures.length > 60)
  console.error(`… and ${failures.length - 60} more failures`);

const category = (failure) => {
  if (failure.includes('brand string with a space')) return 'spaced brand in identifier';
  if (failure.includes('unresolved internal import')) return 'unresolved internal import';
  if (failure.includes('missing asset')) return 'missing asset';
  const code = failure.match(/: (TS\d+) /);
  return code ? `parse ${code[1]}` : 'other';
};
if (failures.length > 0) {
  const tally = new Map();
  for (const failure of failures)
    tally.set(category(failure), (tally.get(category(failure)) ?? 0) + 1);
  console.error('--- failures by category ---');
  for (const [name, count] of [...tally].sort((a, b) => b[1] - a[1]))
    console.error(`${String(count).padStart(6)}  ${name}`);
  console.error(
    `${String(new Set(failures.map((f) => f.split(':')[0])).size).padStart(6)}  distinct files affected`,
  );
}

console.log(
  `Frontend P0: ${parsed} sources parsed; ${importsChecked} internal imports resolved; ${assetsChecked} asset imports checked on disk; ${iconImportsChecked} icon imports checked against the public export list; ${identifierHits} files with a spaced brand inside an identifier.`,
);
assert.equal(
  failures.length,
  0,
  `${failures.length} frontend syntax/import/asset failures`,
);
