import { prepare } from './config.mjs';
try {
  prepare(process.env.KOVAALABCRM_MAIL_FIXTURE_PRIVATE_DIR, process.env);
  console.info('Isolated fictitious mail configuration prepared privately; no provider or CRM account started');
} catch { console.error('Mail fixture preparation refused; private details withheld'); process.exitCode = 1; }
