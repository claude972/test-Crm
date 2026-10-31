import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_AGE } from './config.mjs';
assert.ok(process.pid !== 1, 'Guard must share only the fixture PID namespace');
const target = readFileSync('/proc/1/environ', 'utf8').split('\0');
assert.ok(target.includes(`KOVAALABCRM_FIXTURE_NAMESPACE=${process.env.KOVAALABCRM_FIXTURE_NAMESPACE}`));
assert.ok(target.some((entry) => entry.startsWith('GREENMAIL_OPTS=') && entry.includes('-Dgreenmail.tls.keystore.file=/fixture/server.p12')));
const expires = Date.parse(process.env.KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT);
assert.ok(Number.isFinite(expires) && expires <= Date.now() + MAX_AGE);
// The operator must give this guard ONLY the provider's PID namespace, never host PID access.
setTimeout(() => {
  try { process.kill(1, 'SIGTERM'); } catch { process.exitCode = 1; }
  setTimeout(() => { try { process.kill(1, 'SIGKILL'); } catch { /* already stopped */ } }, 10000);
}, Math.max(0, expires - Date.now()));
