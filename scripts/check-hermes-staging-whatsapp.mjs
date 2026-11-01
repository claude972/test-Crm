import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeReadiness } from '../infra/hermes-staging/whatsapp/client.mjs';
import { IMAGES, prepare } from '../infra/hermes-staging/whatsapp/config.mjs';
export function validateRunner(environment) {
  assert.equal(environment.GITHUB_ACTIONS, 'true'); assert.equal(environment.RUNNER_ENVIRONMENT, 'github-hosted');
  assert.match(environment.HERMES_SOURCE_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.ok(path.isAbsolute(environment.RUNNER_TEMP ?? ''));
  if (environment.HERMES_STAGING_WA_REPORT_FILE) {
    const file = path.resolve(environment.HERMES_STAGING_WA_REPORT_FILE), parent = realpathSync(path.dirname(file)), temporary = realpathSync(environment.RUNNER_TEMP);
    assert.ok(parent === temporary || parent.startsWith(`${temporary}${path.sep}`)); assert.equal(existsSync(file), false);
  }
}
export async function smoke(environment) {
  validateRunner(environment);
  const temporary = mkdtempSync(path.join(realpathSync(environment.RUNNER_TEMP), 'kovaalabcrm-wa-ci-'));
  const prefix = `kovaalabcrm-wa-ci-${randomBytes(6).toString('hex')}`, directory = path.join(temporary, 'private');
  const code = fileURLToPath(new URL('../infra/hermes-staging/whatsapp/', import.meta.url));
  const checks = {}, report = { sourceSha: environment.HERMES_SOURCE_SHA, providerVersion: '2.3.6', realAssociation: false, liveMessages: false, checks };
  let phase = 'prepare', failed, started = false;
  const docker = (args, timeout = 60000) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], timeout, maxBuffer: 1024 * 1024 }).toString().trim();
  let compose;
  const wait = async (probe, timeout = 180000) => { const end = Date.now() + timeout; while (Date.now() < end) { try { if (await probe()) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 1000)); } throw new Error('Readiness timed out'); };
  try {
    const plan = prepare(directory, { KOVAALABCRM_WA_ENABLED: 'true', KOVAALABCRM_WA_ID: `ci-${randomBytes(6).toString('hex')}` });
    const secrets = JSON.parse(readFileSync(`${directory}/credentials.json`, 'utf8'));
    for (const value of Object.values(secrets)) console.info(`::add-mask::${value}`);
    const interpolation = `${temporary}/compose.env`, network = `${prefix}-control`;
    writeFileSync(interpolation, `KOVAALABCRM_WA_PRIVATE_DIR=${directory}\nKOVAALABCRM_WA_SCRIPTS_DIR=${code}\nKOVAALABCRM_WA_HOST=${plan.hostname}\nKOVAALABCRM_WA_CONTROL_NETWORK=${network}\nKOVAALABCRM_WA_TLS_UID=${process.getuid()}\nKOVAALABCRM_WA_TLS_GID=${process.getgid()}\n`, { mode: 0o600, flag: 'wx' });
    const arguments_ = ['compose', '--env-file', interpolation, '-p', prefix, '-f', `${code}/compose.yaml`];
    compose = (args, timeout = 60000) => docker([...arguments_, ...args], timeout);
    phase = 'images'; for (const image of Object.values(IMAGES)) docker(['pull', image], 180000);
    phase = 'compose-validation'; compose(['config', '--quiet']);
    phase = 'database'; started = true; compose(['up', '-d', 'wa-db', 'wa-redis']);
    const container = (service) => compose(['ps', '-aq', service]);
    await wait(() => ['wa-db', 'wa-redis'].every((name) => docker(['inspect', '--format', '{{.State.Health.Status}}', container(name)]) === 'healthy'));
    phase = 'provider-bootstrap'; compose(['up', '-d', 'wa-api', 'wa-tls']);
    const api = container('wa-api'), tls = container('wa-tls');
    const apiInspect = JSON.parse(docker(['inspect', api]))[0], tlsInspect = JSON.parse(docker(['inspect', tls]))[0];
    assert.equal(apiInspect.HostConfig.LogConfig.Type, 'none'); assert.equal(tlsInspect.HostConfig.LogConfig.Type, 'none');
    assert.ok(Object.values(apiInspect.NetworkSettings.Ports ?? {}).every((value) => value === null));
    assert.ok(Object.values(tlsInspect.NetworkSettings.Ports ?? {}).every((value) => value === null));
    assert.equal(Object.keys(apiInspect.NetworkSettings.Networks).length, 3); assert.equal(Object.keys(tlsInspect.NetworkSettings.Networks).length, 2);
    assert.ok(!Object.keys(apiInspect.NetworkSettings.Networks).includes(network));
    assert.equal(JSON.parse(docker(['network', 'inspect', network]))[0].Internal, true); checks.privateNetworkNoPublicPorts = true;
    const mounts = ['--mount', `type=bind,src=${code},dst=/wa-code,readonly`];
    for (const file of ['plan.json', 'operator.json', 'ca.pem']) mounts.push('--mount', `type=bind,src=${directory}/${file},dst=/wa-private/${file},readonly`);
    assert.ok(process.getuid() > 0);
    const common = ['--network', network, '--user', `${process.getuid()}:${process.getgid()}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '128m', '--env', 'KOVAALABCRM_WA_PRIVATE_DIR=/wa-private', ...mounts, '--entrypoint', 'node', IMAGES.node];
    // Readiness is version-only: never replay instance creation or QR connection attempts.
    await wait(() => {
      try {
        const value = JSON.parse(docker(['run', '--rm', ...common, '/wa-code/readiness.mjs'], 15000));
        const diagnostic = safeReadiness(value); if (diagnostic) report.readiness = diagnostic;
        return diagnostic?.success === true && diagnostic.version === '2.3.6';
      } catch (error) {
        try {
          const text = error.stdout?.toString() ?? '';
          if (text.length <= 4096) { const diagnostic = safeReadiness(JSON.parse(text)); if (diagnostic) report.readiness = diagnostic; }
        } catch { /* no raw subprocess output */ }
        return false;
      }
    });
    const status = JSON.parse(docker(['exec', api, 'node', '-e', "process.stdout.write(require('node:fs').readFileSync('/tmp/kovaalabcrm-wa-bootstrap.json','utf8'))"]));
    assert.equal(status.phase, 'runtime'); assert.equal(status.failed, false); checks.strictBootstrap = true;
    phase = 'protocol';
    const result = JSON.parse(docker(['run', '--rm', ...common, '/wa-code/probe.mjs'], 90000));
    assert.equal(result.success, true);
    for (const name of ['realVersion236', 'wrongCaSniRejected', 'instanceKeyIsolationUnpaired', 'webhookRemainsDisabled', 'historyReadPresenceDisabled']) { assert.equal(result.checks[name], true); checks[name] = true; }
    phase = 'opus-binary';
    const opus = "const{spawnSync}=require('node:child_process');const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','s16le','-ar','48000','-ac','1','-i','pipe:0','-c:a','libopus','-f','ogg','pipe:1'],{input:Buffer.alloc(48000*2),maxBuffer:1024*1024});if(r.status!==0||r.stdout.subarray(0,4).toString()!=='OggS'||!r.stdout.includes(Buffer.from('OpusHead')))process.exit(1);";
    docker(['exec', api, 'node', '-e', opus]); checks.ffmpegOpusBytes = true;
    phase = 'persistence';
    const db = container('wa-db'), redis = container('wa-redis');
    const sql = (statement) => docker(['exec', db, 'psql', '-U', 'kovaalabcrm_wa', '-d', 'kovaalabcrm_wa', '-Atqc', statement]);
    assert.equal(sql('SELECT count(*) FROM "Instance"'), '2');
    docker(['exec', api, 'node', '-e', "require('node:fs').writeFileSync('/evolution/instances/.kovaalabcrm-probe','retained')"]);
    docker(['exec', redis, '/bin/sh', '-ec', 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli SET kovaalabcrm-wa-probe retained']);
    compose(['stop', 'wa-tls', 'wa-api']); compose(['restart', 'wa-db', 'wa-redis']);
    await wait(() => docker(['inspect', '--format', '{{.State.Health.Status}}', db]) === 'healthy');
    assert.equal(sql('SELECT count(*) FROM "Instance"'), '2');
    await wait(() => docker(['inspect', '--format', '{{.State.Health.Status}}', redis]) === 'healthy');
    assert.equal(docker(['exec', redis, '/bin/sh', '-ec', 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli GET kovaalabcrm-wa-probe']), 'retained');
    const volume = Object.values(apiInspect.Mounts).find((mount) => mount.Destination === '/evolution/instances').Name;
    docker(['run', '--rm', '--network', 'none', '--mount', `type=volume,src=${volume},dst=/wa-instances,readonly`, '--entrypoint', 'node', IMAGES.node, '-e', "if(require('node:fs').readFileSync('/wa-instances/.kovaalabcrm-probe','utf8')!=='retained')process.exit(1)"]);
    checks.dedicatedPersistentVolumes = true;
    phase = 'done';
  } catch (error) {
    failed = phase;
    if (phase === 'protocol') try {
      let text = error.stdout?.toString() ?? '';
      if (text.length <= 4096) {
        const result = JSON.parse(text.trim());
        if (['version', 'negative-tls', 'auth-isolation', 'disabled-webhook', 'history-settings'].includes(result.failurePhase)) report.providerProbeFailure = result.failurePhase;
      }
    } catch { /* never publish native provider output */ }
    if (phase === 'provider-bootstrap' && compose) {
      for (const service of ['wa-api', 'wa-tls']) try {
        const id = compose(['ps', '-aq', service]);
        const state = JSON.parse(docker(['inspect', '--format', '{{json .State}}', id]));
        report[service === 'wa-api' ? 'apiContainer' : 'tlsContainer'] = { running: state.Running === true, ...(Number.isInteger(state.ExitCode) && state.ExitCode >= 0 && state.ExitCode <= 255 ? { exitCode: state.ExitCode } : {}) };
      } catch { /* no environment/config inspection */ }
    }
    if (phase === 'provider-bootstrap' && compose) try {
      const api = compose(['ps', '-aq', 'wa-api']);
      const file = path.join(temporary, 'bootstrap-status.json');
      docker(['cp', `${api}:/tmp/kovaalabcrm-wa-bootstrap.json`, file]);
      const result = JSON.parse(readFileSync(file, 'utf8'));
      if (['validation', 'migration', 'client-generation', 'runtime'].includes(result.phase) && typeof result.failed === 'boolean') report.bootstrapStatus = { phase: result.phase, failed: result.failed };
    } catch { /* phase-only fallback */ }
  }
  finally {
    let clean = true;
    if (started) try { compose(['down', '--volumes'], 90000); } catch { clean = false; }
    try { assert.equal(docker(['ps', '-aq', '--filter', `label=com.docker.compose.project=${prefix}`]), ''); assert.equal(docker(['volume', 'ls', '-q', '--filter', `label=com.docker.compose.project=${prefix}`]), ''); } catch { clean = false; }
    rmSync(temporary, { recursive: true, force: true }); checks.cleanup = clean && !existsSync(temporary);
    report.success = !failed && checks.cleanup; if (failed) report.failurePhase = failed;
    if (environment.HERMES_STAGING_WA_REPORT_FILE) writeFileSync(environment.HERMES_STAGING_WA_REPORT_FILE, JSON.stringify(report, null, 2), { mode: 0o600, flag: 'wx' });
  }
  assert.equal(report.success, true, `WA infrastructure smoke failed during ${failed ?? 'cleanup'}; no private output published`);
  console.info('WA private infrastructure smoke passed; no phone associated, QR generated or live message sent');
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) smoke(process.env).catch((error) => { console.error(error.message); process.exitCode = 1; });
