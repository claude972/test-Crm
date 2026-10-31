import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_AGE } from './config.mjs';
const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));
export function javaIdentity(cmdline, environment, namespace) {
  const args = cmdline.split('\0').filter(Boolean);
  return path.basename(args[0] ?? '') === 'java' && args.some((arg) => /greenmail.*\.jar$/i.test(arg)) && environment.split('\0').includes(`KOVAALABCRM_FIXTURE_NAMESPACE=${namespace}`) && environment.includes('-Dgreenmail.tls.keystore.file=/fixture/server.p12');
}
export function javaProcesses(namespace) {
  const result = [];
  for (const entry of readdirSync('/proc').filter((name) => /^\d+$/.test(name) && Number(name) > 1)) try {
    if (!javaIdentity(readFileSync(`/proc/${entry}/cmdline`, 'utf8'), readFileSync(`/proc/${entry}/environ`, 'utf8'), namespace)) continue;
    const stat = readFileSync(`/proc/${entry}/stat`, 'utf8');
    const birth = stat.slice(stat.lastIndexOf(')') + 1).trim().split(/\s+/)[19];
    assert.match(birth, /^\d+$/); result.push({ pid: Number(entry), birth });
  } catch { /* a process may exit while its identity is being read */ }
  return result;
}
export function sameProcess(target, namespace) {
  return javaProcesses(namespace).some((value) => value.pid === target.pid && value.birth === target.birth);
}
export async function enforceExpiry(environment) {
  assert.ok(process.pid !== 1, 'Guard requires the provider-only PID namespace');
  const namespace = environment.KOVAALABCRM_FIXTURE_NAMESPACE;
  assert.match(namespace ?? '', /^[a-z0-9][a-z0-9-]{2,30}[a-z0-9]$/);
  assert.deepEqual(readFileSync('/proc/1/cmdline', 'utf8').split('\0').filter(Boolean), ['/bin/sh', '/fixture-code/provider-init.sh']);
  assert.ok(readFileSync('/proc/1/environ', 'utf8').split('\0').includes(`KOVAALABCRM_FIXTURE_NAMESPACE=${namespace}`));
  const expires = Date.parse(environment.KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT);
  assert.ok(Number.isFinite(expires) && expires <= Date.now() + MAX_AGE);
  const startup = Date.now() + 20000;
  let candidates = javaProcesses(namespace);
  while (!candidates.length && Date.now() < startup) { await delay(100); candidates = javaProcesses(namespace); }
  assert.equal(candidates.length, 1, 'Exactly one fixture Java child required');
  const target = candidates[0];
  await delay(Math.max(0, expires - Date.now()));
  if (!sameProcess(target, namespace)) return;
  process.kill(target.pid, 'SIGTERM');
  await delay(10000);
  if (sameProcess(target, namespace)) process.kill(target.pid, 'SIGKILL');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) enforceExpiry(process.env).catch(() => { console.error('Fixture expiry guard refused an unverified process namespace'); process.exitCode = 1; });
