const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const temporary = mkdtempSync(path.join(os.tmpdir(), 'hermes-p0-runtime-'));
const scriptDirectory = path.join(temporary, 'scripts');
mkdirSync(scriptDirectory);
for (const file of ['local-project.mjs', 'customer-tools.mjs', 'assert-local-runtime-owner.mjs', 'backup-local.mjs']) copyFileSync(path.join(__dirname, file), path.join(scriptDirectory, file));
const run = (script, action) => spawnSync(process.execPath, [path.join(scriptDirectory, script), ...action], {
  cwd: temporary, encoding: 'utf8', env: { ...process.env, DOCKER_BIN: path.join(temporary, 'must-not-run-docker') },
});
try {
  assert.equal(run('local-project.mjs', ['setup']).status, 0);
  const privateFiles = ['.runtime/customer-tools.env', 'apps/crm/ui/.runtime/infra.env', 'apps/crm/ui/.runtime/server.env', 'apps/crm/ui/.runtime/front.env'];
  const before = privateFiles.map((file) => readFileSync(path.join(temporary, file)));
  assert.equal(run('local-project.mjs', ['setup']).status, 0);
  privateFiles.forEach((file, index) => {
    assert.deepEqual(readFileSync(path.join(temporary, file)), before[index]);
    assert.equal(statSync(path.join(temporary, file)).mode & 0o777, 0o600);
  });
  const dist = path.join(temporary, 'apps/crm/ui/packages/twenty-server/dist/database/scripts');
  mkdirSync(dist, { recursive: true });
  writeFileSync(path.join(dist, 'setup-db.js'), 'throw new Error("must not execute");');
  for (const url of ['postgresql://example.invalid:5438/hermes_crm_dev', 'postgresql://127.0.0.1:5438/other_database', 'postgresql://127.0.0.1:5432/hermes_crm_dev']) {
    writeFileSync(path.join(temporary, 'apps/crm/ui/.runtime/server.env'), `PG_DATABASE_URL=${url}\n`);
    const result = run('local-project.mjs', ['init']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /réservée à la base locale/);
    assert.doesNotMatch(result.stderr, /must-not-run-docker|must not execute/);
  }
  const missing = run('customer-tools.mjs', ['build', 'calendar']);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Sources du module calendar absentes/);
  assert.notEqual(run('local-project.mjs', ['unknown']).status, 0);
  writeFileSync(path.join(temporary, '.git'), 'gitdir: /not-used/worktrees/p0');
  for (const action of ['init', 'start', 'start-crm', 'stop']) {
    const protectedCommand = run('local-project.mjs', [action]);
    assert.notEqual(protectedCommand.status, 0);
    assert.match(protectedCommand.stderr, /ce worktree ne possède pas un runtime isolé/);
  }
  for (const action of ['start', 'stop', 'build']) {
    const protectedCommand = run('customer-tools.mjs', [action, 'forms']);
    assert.notEqual(protectedCommand.status, 0);
    assert.match(protectedCommand.stderr, /ce worktree ne possède pas un runtime isolé/);
  }
  const backup = run('backup-local.mjs', []);
  assert.notEqual(backup.status, 0);
  assert.match(backup.stderr, /ce worktree ne possède pas un runtime isolé/);

  console.log('Runtime P0: setup preserves private configuration and 0600 permissions; remote/wrong database init rejected; missing module, unknown command and shared-runtime worktree operations rejected. No service or database started.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
