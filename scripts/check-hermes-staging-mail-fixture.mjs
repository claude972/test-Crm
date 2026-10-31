import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, realpathSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare, GREENMAIL_IMAGE, NODE_IMAGE } from '../infra/hermes-staging/mail-fixture/config.mjs';

export function validateRunner(environment) {
  assert.equal(environment.GITHUB_ACTIONS, 'true');
  assert.equal(environment.RUNNER_ENVIRONMENT, 'github-hosted');
  assert.match(environment.HERMES_SOURCE_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.ok(path.isAbsolute(environment.RUNNER_TEMP ?? ''));
  if (environment.HERMES_STAGING_MAIL_REPORT_FILE) {
    const target = path.resolve(environment.HERMES_STAGING_MAIL_REPORT_FILE);
    const root = realpathSync(environment.RUNNER_TEMP);
    const parent = realpathSync(path.dirname(target));
    assert.ok(parent === root || parent.startsWith(`${root}${path.sep}`));
    assert.equal(existsSync(target), false);
  }
}
export async function smoke(environment) {
  validateRunner(environment);
  const root = mkdtempSync(path.join(realpathSync(environment.RUNNER_TEMP), 'kovaalabcrm-mail-smoke-'));
  const directory = path.join(root, 'private');
  const id = `smoke-${randomBytes(6).toString('hex')}`;
  const network = `kovaalabcrm-mail-smoke-${id}`;
  const fixture = `${network}-provider`, guard = `${network}-expiry`;
  const resources = [];
  const checks = {};
  const report = { mode: 'isolated-capture-only', sourceSha: environment.HERMES_SOURCE_SHA, checks };
  const code = fileURLToPath(new URL('../infra/hermes-staging/mail-fixture/', import.meta.url));
  const docker = (args, timeout = 60000) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], timeout, maxBuffer: 1024 * 1024 }).toString().trim();
  let phase = 'prepare', failed;
  let createdNetwork = false;
  try {
    const plan = prepare(directory, { KOVAALABCRM_MAIL_FIXTURE_ENABLED: 'true', KOVAALABCRM_MAIL_FIXTURE_ID: id });
    for (const secret of [...Object.values(JSON.parse(readFileSync(path.join(directory, 'credentials.json'), 'utf8'))), readFileSync(path.join(directory, 'keystore-password'), 'utf8'), readFileSync(path.join(directory, 'root-secret'), 'utf8')]) console.info(`::add-mask::${secret}`);
    phase = 'pinned-images'; docker(['pull', NODE_IMAGE], 120000); docker(['pull', GREENMAIL_IMAGE], 120000);
    phase = 'network'; docker(['network', 'create', '--internal', network]); createdNetwork = true;
    phase = 'provider'; resources.push(fixture);
    const uid = process.getuid(), gid = process.getgid(); assert.ok(uid > 0);
    docker(['run', '--detach', '--name', fixture, '--network', network, '--network-alias', plan.hostname, '--user', `${uid}:${gid}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '256m', '--cpus', '0.5', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '--mount', `type=bind,src=${directory}/server.p12,dst=/fixture/server.p12,readonly`, '--env-file', `${directory}/provider.env`, '--mount', `type=bind,src=${code},dst=/fixture-code,readonly`, '--entrypoint', '/bin/sh', GREENMAIL_IMAGE, '/fixture-code/provider-init.sh']);
    const container = JSON.parse(docker(['inspect', fixture]))[0];
    assert.deepEqual(Object.keys(container.NetworkSettings.Networks), [network]);
    assert.ok(Object.values(container.NetworkSettings.Ports ?? {}).every((value) => value === null));
    assert.equal(JSON.parse(docker(['network', 'inspect', network]))[0].Internal, true);
    checks.networkPrivateNoPorts = true;
    // A TLS-only readiness check avoids replaying SMTP deposits when the provider is still starting.
    phase = 'readiness';
    const ready = `const tls=require('node:tls'),fs=require('node:fs');const s=tls.connect({host:'${plan.hostname}',port:3993,servername:'${plan.hostname}',ca:fs.readFileSync('/fixture-ca.pem'),rejectUnauthorized:true});s.setTimeout(3000,()=>s.destroy());s.once('secureConnect',()=>{s.end();process.exit(0)});s.once('error',()=>process.exit(1));s.once('close',()=>process.exit(1));`;
    const deadline = Date.now() + 60000;
    for (;;) {
      try { docker(['run', '--rm', '--network', network, '--mount', `type=bind,src=${directory}/ca.pem,dst=/fixture-ca.pem,readonly`, '--entrypoint', 'node', NODE_IMAGE, '-e', ready], 15000); break; }
      catch { assert.ok(Date.now() < deadline); await new Promise((resolve) => setTimeout(resolve, 1000)); }
    }
    phase = 'protocol';
    const probe = `${network}-probe`; resources.push(probe);
    const args = ['run', '--name', probe, '--network', network, '--user', `${uid}:${gid}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '128m', '--cpus', '0.5', '--env', 'KOVAALABCRM_MAIL_FIXTURE_PRIVATE_DIR=/private-fixture', '--mount', `type=bind,src=${code},dst=/fixture-code,readonly`];
    for (const file of ['plan.json', 'credentials.json', 'ca.pem']) args.push('--mount', `type=bind,src=${directory}/${file},dst=/private-fixture/${file},readonly`);
    const result = JSON.parse(docker([...args, '--entrypoint', 'node', NODE_IMAGE, '/fixture-code/probe.mjs'], 90000));
    assert.equal(result.mode, 'isolated-capture-only');
    for (const name of ['wrongCaSniHostRejected', 'authFoldersDraftMime', 'authSmtpImapCapture', 'noWan']) { assert.equal(result.checks[name], true); checks[name] = true; }
    const routes = docker(['exec', fixture, '/bin/sh', '-ec', 'cat /proc/net/route']);
    assert.ok(!routes.split('\n').slice(1).some((line) => line.trim().split(/\s+/)[1] === '00000000'));
    checks.providerNoDefaultRoute = true;
    phase = 'term-resistant-expiry'; resources.push(guard);
    // Suspend the real Java child: TERM cannot be processed, so this requires the hard-kill path.
    const suspend = `import {javaProcesses,sameProcess} from '/fixture-code/expiry.mjs';const values=javaProcesses(process.env.KOVAALABCRM_FIXTURE_NAMESPACE);if(values.length!==1||!sameProcess(values[0],process.env.KOVAALABCRM_FIXTURE_NAMESPACE))process.exit(1);process.kill(values[0].pid,'SIGSTOP');`;
    docker(['run', '--rm', '--network', 'none', '--pid', `container:${fixture}`, '--user', `${uid}:${gid}`, '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--env', `KOVAALABCRM_FIXTURE_NAMESPACE=${id}`, '--mount', `type=bind,src=${code},dst=/fixture-code,readonly`, '--entrypoint', 'node', NODE_IMAGE, '--input-type=module', '-e', suspend]);
    const expiry = new Date(Date.now() + 4000).toISOString();
    docker(['run', '--detach', '--name', guard, '--network', 'none', '--pid', `container:${fixture}`, '--user', `${uid}:${gid}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '64m', '--env', `KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT=${expiry}`, '--env', `KOVAALABCRM_FIXTURE_NAMESPACE=${id}`, '--mount', `type=bind,src=${code},dst=/fixture-code,readonly`, '--entrypoint', 'node', NODE_IMAGE, '/fixture-code/expiry.mjs']);
    const expires = Date.now() + 20000;
    while (docker(['inspect', '--format', '{{.State.Running}}', fixture]) === 'true') { assert.ok(Date.now() < expires); await new Promise((resolve) => setTimeout(resolve, 500)); }
    checks.expiryStopsProvider = true;
    checks.expiryStopsTermResistantJava = true;
    phase = 'done';
  } catch { failed = phase; }
  finally {
    let clean = true;
    for (const name of resources.reverse()) try { docker(['rm', '--force', name]); } catch { clean = false; }
    if (createdNetwork) try { docker(['network', 'rm', network]); } catch { clean = false; }
    rmSync(root, { recursive: true, force: true });
    checks.cleanup = clean && !existsSync(root);
    report.success = !failed && checks.cleanup;
    if (failed) report.failurePhase = failed;
    if (environment.HERMES_STAGING_MAIL_REPORT_FILE) writeFileSync(environment.HERMES_STAGING_MAIL_REPORT_FILE, JSON.stringify(report, null, 2), { mode: 0o600, flag: 'wx' });
  }
  assert.equal(report.success, true, `Isolated fixture smoke failed during ${failed ?? 'cleanup'}; private details withheld`);
  console.info('Isolated fake-provider smoke passed; no CRM account seeded or external mail delivered');
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) smoke(process.env).catch((error) => { console.error(error.message); process.exitCode = 1; });
