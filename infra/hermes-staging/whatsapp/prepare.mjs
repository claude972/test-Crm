import { prepare } from './config.mjs';
try { prepare(process.env.KOVAALABCRM_WA_PRIVATE_DIR, process.env); console.info('Private WA configuration prepared atomically; no provider started or phone associated'); }
catch { console.error('WA preparation refused; private details withheld; no ready target created'); process.exitCode = 1; }
