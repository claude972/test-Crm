import { readFileSync } from 'node:fs';
import { providerRequest, safeReadiness, PROVIDER_CODES } from './client.mjs';
const directory = process.env.KOVAALABCRM_WA_PRIVATE_DIR;
let phase = 'private-files';
try {
  const plan = JSON.parse(readFileSync(`${directory}/plan.json`, 'utf8'));
  const keys = JSON.parse(readFileSync(`${directory}/operator.json`, 'utf8'));
  const ca = readFileSync(`${directory}/ca.pem`);
  phase = 'https-request';
  const value = await providerRequest(plan, keys.globalKey, 'GET', '/', undefined, { ca });
  phase = 'version';
  const success = value.version === '2.3.6';
  const diagnostic = safeReadiness({ phase, success, category: success ? undefined : 'version-mismatch', httpStatus: 200, version: value.version });
  console.info(JSON.stringify(diagnostic));
  if (!success) process.exitCode = 1;
} catch (error) {
  console.info(JSON.stringify(safeReadiness({ phase, success: false, ...(error.providerDiagnostic ?? { category: 'client-validation', ...(PROVIDER_CODES.includes(error.code) ? { code: error.code } : {}) }) })));
  process.exitCode = 1;
}
