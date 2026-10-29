const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dependencyRequire = process.env.HERMES_CHECK_MODULES
  ? createRequire(path.resolve(process.env.HERMES_CHECK_MODULES, 'package.json'))
  : require;
const ts = dependencyRequire('typescript');
const handlebars = dependencyRequire('handlebars');
const formRoot = path.join(root, 'apps/crm/form');
const files = execFileSync('git', ['ls-files', '-z', 'apps/crm/form'], { cwd: root })
  .toString().split('\0').filter((file) => /\.(?:ts|tsx|mts)$/.test(file));
let errors = 0;
for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
  for (const diagnostic of source.parseDiagnostics) {
    errors += 1;
    console.error(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
  }
}
assert.equal(errors, 0, 'Forms sources must parse');

handlebars.registerHelper('json', (value) => JSON.stringify(value));
for (const file of ['packages/webapp/index.html', 'packages/server/view/index.html']) {
  const html = handlebars.compile(readFileSync(path.join(formRoot, file), 'utf8'))({
    kovaaLab: { enableGoogleFonts: true, homepageURL: 'https://forms.example.test' },
    locale: 'fr',
  });
  const browser = {
    navigator: { userAgent: 'Android' },
    innerHeight: 800,
    screen: { height: 900 },
  };
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).filter((source) => source.includes('window.navigator'));
  assert.equal(scripts.length, 1, `${file}: expected runtime bootstrap`);
  vm.runInNewContext(scripts[0], { window: browser });
  assert.equal(browser.kovaaLab.device.mobile, true);
  assert.equal(browser.kovaaLab.device.android, true);
  if (file.includes('/server/')) {
    assert.equal(browser.kovaaLab.homepageURL, 'https://forms.example.test');
    assert.equal(browser.kovaaLab.device.locale, 'fr');
  }
}

// Existing encrypted credentials must keep the original v1 key derivation.
const cryptoPath = path.join(formRoot, 'packages/server/src/utils/crypto.ts');
const compiled = ts.transpileModule(readFileSync(cryptoPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject,
  Buffer,
  require(name) {
    if (name === 'crypto') return crypto;
    if (name === 'bcrypt') return {};
    if (name === '@kovaa-lab/utils') return { helper: { isEmpty: (value) => !value } };
    throw new Error(`Unexpected dependency: ${name}`);
  },
});
const key = 'p0-compatibility-fixture';
const derived = crypto.hkdfSync('sha256', key, Buffer.alloc(0), 'kovaa-lab:stored-secret', 32);
const iv = Buffer.alloc(12, 7);
const cipher = crypto.createCipheriv('aes-256-gcm', derived, iv, { authTagLength: 16 });
const encrypted = Buffer.concat([cipher.update('existing-fixture', 'utf8'), cipher.final()]);
const envelope = ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
assert.equal(exportsObject.decryptSecret(envelope, key), 'existing-fixture');
assert.throws(() => exportsObject.decryptSecret(envelope, 'incorrect-fixture-key'));
const tampered = envelope.split('.');
tampered[3] = Buffer.alloc(encrypted.length).toString('base64');
assert.throws(() => exportsObject.decryptSecret(tampered.join('.'), key));
console.log(`Forms P0: ${files.length} TypeScript sources parsed; both HTML bootstraps executed; existing encrypted credential, wrong-key and tampering checks passed.`);
