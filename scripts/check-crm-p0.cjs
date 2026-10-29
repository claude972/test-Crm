const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dependencyRequire = process.env.HERMES_CHECK_MODULES
  ? createRequire(path.resolve(process.env.HERMES_CHECK_MODULES, 'package.json'))
  : require;
const ts = dependencyRequire('typescript');
const workspace = path.join(root, 'apps/crm/ui');
const packages = ['twenty-server', 'twenty-shared'];
const failures = [];
let parsed = 0;
let importsChecked = 0;
for (const packageName of packages) {
  const packageRoot = path.join(workspace, 'packages', packageName);
  const configPath = path.join(packageRoot, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined, `${configPath}: invalid configuration`);
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, packageRoot).options;
  const files = execFileSync('git', ['ls-files', '-z', `apps/crm/ui/packages/${packageName}`], { cwd: root, maxBuffer: 16 * 1024 * 1024 })
    .toString().split('\0').filter((file) => /\.(?:ts|tsx|mts)$/.test(file) && !file.includes('/locales/'));
  for (const file of files) {
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) continue;
    const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true);
    parsed += 1;
    for (const diagnostic of source.parseDiagnostics) {
      failures.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }
    for (const statement of source.statements) {
      if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))) continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      const name = specifier.text.replace(/\?source$/, '');
      if (!name.startsWith('.') && !name.startsWith('src/') && !name.startsWith('@/')) continue;
      importsChecked += 1;
      const jsonFile = name.endsWith('.json') && name.startsWith('.') && existsSync(path.resolve(path.dirname(absolute), name));
      const resolved = jsonFile || ts.resolveModuleName(name, absolute, options, ts.sys).resolvedModule;
      if (!resolved) failures.push(`${file}: unresolved internal import ${name}`);
    }
  }
}
for (const failure of failures.slice(0, 50)) console.error(failure);
assert.equal(failures.length, 0, `${failures.length} syntax/internal import failures`);

function loadExports(relativePath) {
  const exportsObject = {};
  const compiled = ts.transpileModule(readFileSync(path.join(workspace, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { exports: exportsObject });
  return exportsObject;
}
const { LOGIC_FUNCTION_HTTP_RESPONSE_MARKER } = loadExports('packages/twenty-shared/src/types/LogicFunctionResponse.ts');
const { Response } = loadExports('packages/twenty-sdk/src/sdk/logic-function/response.ts');
const response = new Response({ ok: true }, { status: 201 });
assert.equal(LOGIC_FUNCTION_HTTP_RESPONSE_MARKER, '__kovaa-labHttpResponse');
assert.equal(response[LOGIC_FUNCTION_HTTP_RESPONSE_MARKER], true);
assert.equal(response.status, 201);
assert.equal(response.body.ok, true);
console.log(`CRM P0: ${parsed} backend/shared TypeScript files parsed; ${importsChecked} internal imports resolved; legacy SDK response marker preserved.`);
