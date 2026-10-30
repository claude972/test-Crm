import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Browser smoke is for the disposable cloud environment');
assert.ok([undefined, 'true', 'false'].includes(process.env.P1_HERMES_BROWSER_SMOKE), 'P1_HERMES_BROWSER_SMOKE must be true or false');
const hermesSmoke = process.env.P1_HERMES_BROWSER_SMOKE === 'true';
if (hermesSmoke) {
  assert.equal(process.env.HERMES_B2B_CAMPAIGNS_ENABLED, 'true', 'P1 Hermes reception requires the explicit disposable B2B campaign opt-in');
  const database = new URL(process.env.PG_DATABASE_URL);
  assert.ok(['postgres:', 'postgresql:'].includes(database.protocol));
  assert.equal(database.hostname, '127.0.0.1');
  assert.equal(database.port, '5432');
  assert.equal(database.pathname, '/p0_ci');
  assert.equal(database.search, '');
  assert.equal(database.hash, '');
  assert.match(process.env.GITHUB_RUN_ID ?? '', /^\d{1,20}$/);
}
const API_ORIGIN = 'http://127.0.0.1:3000';
const FRONTEND_ORIGIN = 'http://127.0.0.1:3001';
const APP_API_ORIGIN = hermesSmoke ? FRONTEND_ORIGIN : API_ORIGIN;
// Verified against SettingsPath.Structures and getSettingsPath at 64fd5f28a.
const STRUCTURES_PATH = '/settings/structures';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'apps/crm/ui/packages/twenty-front');
const indexPath = path.join(frontend, 'build/index.html');
assert.ok(existsSync(indexPath), 'A real frontend build is required');
const originalIndex = readFileSync(indexPath, 'utf8');
const runtimeConfig = /window\._env_\s*=\s*\{[\s\S]*?\};/g;
assert.equal([...originalIndex.matchAll(runtimeConfig)].length, 1, 'Expected one existing runtime configuration slot');
const require = createRequire(path.join(frontend, 'package.json'));
const { chromium } = require('playwright');
const screenshots = path.join(root, 'p0-browser-artifacts');
mkdirSync(screenshots, { recursive: true });
// Production auth deliberately refuses cross-origin loopback cookie issuance.
// Match the real preview topology: route the published API paths under the
// frontend origin and preserve its canonical Host. Do not weaken Auth/CORS.
const proxy = {};
if (hermesSmoke) {
  const contract = readFileSync(path.join(root, 'apps/crm/ui/packages/twenty-shared/src/types/ApiPath.ts'), 'utf8');
  const body = contract.match(/export enum ApiPath\s*\{([\s\S]*?)\}/)?.[1];
  assert.ok(body, 'ApiPath contract is required for same-origin browser verification');
  assert.equal(body.replace(/^\s*\w+\s*=\s*'([^']+)',?\s*$/gm, '').trim(), '', 'Unsupported ApiPath contract syntax');
  for (const [, prefix] of body.matchAll(/^\s*\w+\s*=\s*'([^']+)',?\s*$/gm)) {
    assert.match(prefix, /^[a-z.-]+$/);
    const escaped = prefix.replaceAll('.', '[.]');
    proxy[`^/${escaped}(?:[/?]|$)`] = {
      target: API_ORIGIN, changeOrigin: false, ws: true,
      headers: { host: new URL(FRONTEND_ORIGIN).host },
    };
  }
  assert.ok(Object.keys(proxy).length > 0);
}
writeFileSync(indexPath, originalIndex.replace(runtimeConfig, `window._env_ = { REACT_APP_SERVER_BASE_URL: ${JSON.stringify(APP_API_ORIGIN)} };`));
const previewOptions = { host: '127.0.0.1', port: 3001, strictPort: true, ...(hermesSmoke ? { proxy } : {}) };
const preview = spawn(process.execPath, ['--input-type=module', '-e', `const { preview } = await import('vite'); await preview({ preview: ${JSON.stringify(previewOptions)} });`], {
  cwd: frontend,
  env: { ...process.env, CI: 'true' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let previewLog = '';
for (const stream of [preview.stdout, preview.stderr]) stream.on('data', (data) => { previewLog = (previewLog + data).slice(-10_000); });
let browser;
let hermesFixture;
const hermesEvidence = [];

// Only explicitly selected diagnostic fields may reach logs/artifacts. Never dump
// a response, variables, headers, error cause or arbitrary extensions.
const diagnosticSecrets = new Set();
const diagnosticFailures = [];
function rememberDiagnosticSecrets(value) {
  if (typeof value === 'string' && value.length > 0) diagnosticSecrets.add(value);
  else if (Array.isArray(value)) value.forEach(rememberDiagnosticSecrets);
  else if (value && typeof value === 'object') Object.values(value).forEach(rememberDiagnosticSecrets);
}
function safeDiagnosticText(value, limit = 240) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  let text = String(value);
  for (const secret of diagnosticSecrets) {
    for (const variant of [secret, encodeURIComponent(secret), JSON.stringify(secret).slice(1, -1)]) {
      text = text.split(variant).join('[REDACTED]');
    }
  }
  return text
    .replace(/Bearer\s+[^\s,"']+/gi, 'Bearer [REDACTED]')
    .replace(/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/\b[A-Za-z0-9_+\/-]{24,}={0,2}\b/g, '[REDACTED_OPAQUE]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/::/g, ': :')
    .slice(0, limit);
}
function graphqlDiagnostic(endpoint, query, status, body, kind) {
  const operation = query.match(/\b(?:query|mutation)\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? 'anonymous';
  return {
    endpoint, operation, httpStatus: status ?? null, kind,
    errors: Array.isArray(body?.errors) ? body.errors.slice(0, 4).map((error) => ({
      code: safeDiagnosticText(error?.extensions?.code, 80),
      path: Array.isArray(error?.path) ? error.path.slice(0, 8).map((part) => safeDiagnosticText(part, 80)) : undefined,
      message: safeDiagnosticText(error?.message),
    })) : [],
  };
}
function failGraphql(diagnostic) {
  diagnosticFailures.push(diagnostic);
  if (diagnosticFailures.length > 10) diagnosticFailures.shift();
  writeFileSync(path.join(screenshots, 'hermes-graphql-errors.json'), `${JSON.stringify(diagnosticFailures, null, 2)}\n`, { mode: 0o600 });
  throw new Error(`P1 Hermes smoke: ${JSON.stringify(diagnostic)}`);
}
async function graphql(endpoint, query, variables = {}, token, timeout = 45_000) {
  rememberDiagnosticSecrets(variables);
  rememberDiagnosticSecrets(token);
  rememberDiagnosticSecrets(process.env.APP_SECRET);
  rememberDiagnosticSecrets(process.env.PG_DATABASE_URL);
  if (process.env.PG_DATABASE_URL) {
    rememberDiagnosticSecrets(decodeURIComponent(new URL(process.env.PG_DATABASE_URL).password));
  }
  let response;
  try {
    response = await fetch(`${APP_API_ORIGIN}/${endpoint}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeout),
      headers: { 'Content-Type': 'application/json', Origin: FRONTEND_ORIGIN, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    // The transport's message/cause may contain URLs, credentials or request data.
    failGraphql(graphqlDiagnostic(endpoint, query, undefined, undefined,
      ['TimeoutError', 'AbortError'].includes(error?.name) ? 'timeout' : 'transport'));
  }
  let body;
  try { body = await response.json(); } catch {
    failGraphql(graphqlDiagnostic(endpoint, query, response.status, undefined, 'invalid-json'));
  }
  if (response.status !== 200 || body?.errors?.length || !body?.data) {
    failGraphql(graphqlDiagnostic(endpoint, query, response.status, body,
      response.status !== 200 ? 'http' : body?.errors?.length ? 'graphql' : 'missing-data'));
  }
  return body.data;
}

function sessionToken(value) {
  assert.ok(typeof value === 'string' && value.length > 20, 'P1 Hermes smoke: no real auth token');
  rememberDiagnosticSecrets(value);
  console.info(`::add-mask::${value}`);
  return value;
}

async function prepareHermesFixture() {
  const configResponse = await fetch(`${API_ORIGIN}/client-config`, { signal: AbortSignal.timeout(10_000), redirect: 'error' });
  assert.equal(configResponse.status, 200);
  const config = await configResponse.json();
  assert.equal(config.serverUrl, APP_API_ORIGIN, 'P1 Hermes smoke requires the public same-origin API URL');
  assert.equal(config.authProviders.password, true, 'P1 Hermes smoke requires password auth');
  assert.equal(config.isEmailVerificationRequired, false, 'P1 Hermes smoke must not send verification email');
  assert.equal(config.billing.isBillingEnabled, false, 'P1 Hermes smoke requires disposable billing-disabled runtime');
  assert.equal(config.isMultiWorkspaceEnabled, false, 'P1 Hermes smoke fixture uses the existing single-workspace auth flow');
  const suffix = randomBytes(5).toString('hex');
  hermesFixture = {
    email: `p1-browser-${process.env.GITHUB_RUN_ID}-${suffix}@example.com`,
    password: `Aa9!${randomBytes(24).toString('base64url')}`,
    companyId: randomUUID(), companyName: `P1 browser synthetic ${suffix}`, companyAttempted: false,
  };
  const fixture = hermesFixture;
  console.info(`::add-mask::${fixture.password}`);
  const signup = await graphql('metadata', 'mutation P1Signup($email:String!,$password:String!) { signUp(email:$email,password:$password) { tokens { accessOrWorkspaceAgnosticToken { token } } } }', { email: fixture.email, password: fixture.password });
  fixture.token = sessionToken(signup.signUp.tokens.accessOrWorkspaceAgnosticToken.token);
  const created = await graphql('metadata', 'mutation P1Workspace($input:SignUpInNewWorkspaceInput) { signUpInNewWorkspace(input:$input) { loginToken { token } workspace { id displayName workspaceUrls { subdomainUrl customUrl } } } }', { input: { displayName: `P1 CI ${process.env.GITHUB_RUN_ID} ${suffix}` } }, fixture.token);
  fixture.workspace = created.signUpInNewWorkspace.workspace;
  const workspaceUrls = fixture.workspace.workspaceUrls;
  assert.equal(new URL(workspaceUrls.customUrl ?? workspaceUrls.subdomainUrl).origin, FRONTEND_ORIGIN, 'P1 Hermes smoke: native workspace URL leaves the frontend origin');
  const exchange = await graphql('metadata', 'mutation P1Exchange($loginToken:String!,$origin:String!) { getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin) { tokens { accessOrWorkspaceAgnosticToken { token } } } }', { loginToken: sessionToken(created.signUpInNewWorkspace.loginToken.token), origin: FRONTEND_ORIGIN });
  fixture.token = sessionToken(exchange.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token);
  const activated = await graphql('metadata', 'mutation P1Activate($input:ActivateWorkspaceInput!) { activateWorkspace(data:$input) { id activationStatus } }', { input: {} }, fixture.token, 180_000);
  assert.equal(activated.activateWorkspace.id, fixture.workspace.id);
  assert.ok(['CREATED', 'ACTIVE'].includes(activated.activateWorkspace.activationStatus));
  const login = await graphql('metadata', 'mutation P1Login($email:String!,$password:String!,$origin:String!) { getLoginTokenFromCredentials(email:$email,password:$password,origin:$origin) { loginToken { token } } }', { email: fixture.email, password: fixture.password, origin: FRONTEND_ORIGIN });
  const resumed = await graphql('metadata', 'mutation P1Resume($loginToken:String!,$origin:String!) { getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin) { tokens { accessOrWorkspaceAgnosticToken { token } } } }', { loginToken: sessionToken(login.getLoginTokenFromCredentials.loginToken.token), origin: FRONTEND_ORIGIN });
  fixture.token = sessionToken(resumed.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token);
  assert.equal((await graphql('metadata', 'mutation { skipSyncEmailOnboardingStep(isAutoSkipped:true) { success } }', {}, fixture.token)).skipSyncEmailOnboardingStep.success, true);
  const profile = await graphql('graphql', 'query P1Profile($filter:WorkspaceMemberFilterInput!) { workspaceMember(filter:$filter) { id } }', { filter: { userEmail: { eq: fixture.email } } }, fixture.token);
  assert.ok(profile.workspaceMember?.id, 'P1 Hermes smoke: profile is missing');
  const updated = await graphql('metadata', 'mutation P1ProfileUpdate($input:UpdateWorkspaceMemberSettingsInput!) { updateWorkspaceMemberSettings(input:$input) }', { input: { workspaceMemberId: profile.workspaceMember.id, update: { name: { firstName: 'Browser', lastName: 'Hermes' } } } }, fixture.token);
  assert.equal(updated.updateWorkspaceMemberSettings, true);
  const invited = await graphql('metadata', 'mutation { sendInvitations(emails:[]) { success errors result { id } } }', {}, fixture.token);
  assert.equal(invited.sendInvitations.success, true);
  assert.deepEqual(invited.sendInvitations.errors, []);
  assert.deepEqual(invited.sendInvitations.result, []);
  assert.equal((await graphql('metadata', 'query { currentUser { onboardingStatus } }', {}, fixture.token)).currentUser.onboardingStatus, 'COMPLETED');
  fixture.companyAttempted = true;
  const company = await graphql('graphql', 'mutation P1Company($input:CompanyCreateInput!) { createCompany(data:$input) { id name } }', { input: { id: fixture.companyId, name: fixture.companyName } }, fixture.token);
  assert.equal(company.createCompany.id, fixture.companyId);
  const saved = await graphql('graphql', 'query P1SavedCompany($filter:CompanyFilterInput!) { companies(filter:$filter,first:2) { edges { node { id name } } } }', { filter: { id: { eq: fixture.companyId } } }, fixture.token);
  assert.deepEqual(saved.companies.edges.map(({ node }) => node), [{ id: fixture.companyId, name: fixture.companyName }]);
  console.info('P1 Hermes smoke: real synthetic user/workspace onboarding and persisted fixture verified');
}

function hasOperation(response, field) {
  if (response.url() !== `${APP_API_ORIGIN}/metadata`) return false;
  try {
    const payload = response.request().postDataJSON();
    return [payload].flat().some((operation) => typeof operation?.query === 'string' && operation.query.includes(field));
  } catch { return false; }
}

async function checkHermesDashboard(page, name) {
  const fixture = hermesFixture;
  await page.getByPlaceholder('Email', { exact: true }).fill(fixture.email);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const password = page.getByPlaceholder('Password', { exact: true });
  await password.waitFor({ state: 'visible', timeout: 60_000 });
  await password.fill(fixture.password);
  const authenticated = page.waitForResponse((response) => hasOperation(response, 'getAuthTokensFromLoginToken'), { timeout: 60_000 });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const authResponse = await authenticated;
  assert.equal(authResponse.status(), 200, 'P1 Hermes smoke: browser auth HTTP failed');
  assert.ok(!(await authResponse.json()).errors?.length, 'P1 Hermes smoke: browser auth rejected');
  await password.waitFor({ state: 'hidden', timeout: 60_000 });

  const queried = page.waitForResponse((response) => hasOperation(response, 'hermesStructureDashboard'), { timeout: 60_000 });
  await page.goto(`${FRONTEND_ORIGIN}${STRUCTURES_PATH}`, { waitUntil: 'domcontentloaded' });
  const response = await queried;
  assert.equal(response.status(), 200, 'P1 Hermes smoke: dashboard HTTP failed');
  const body = await response.json();
  assert.ok(!body.errors?.length, 'P1 Hermes smoke: dashboard resolver returned errors');
  const dashboard = body.data?.hermesStructureDashboard;
  assert.ok(dashboard && Array.isArray(dashboard.structures) && dashboard.structures.length === 1, 'P1 Hermes smoke: expected exactly the authorized synthetic structure');
  assert.equal(dashboard.partial, false, 'P1 Hermes smoke: owner metrics must be available');
  const row = dashboard.structures[0];
  assert.equal(row.structure.workspaceId, fixture.workspace.id);
  assert.equal(row.structure.isCurrent, true);
  assert.equal(row.structure.requiresAuthentication, false);
  const labels = { companies: 'Companies', people: 'People', opportunities: 'Opportunities', tasks: 'Tasks' };
  assert.deepEqual(dashboard.totals.map(({ key }) => key).sort(), Object.keys(labels).sort());
  assert.deepEqual(row.metrics.map(({ key }) => key).sort(), Object.keys(labels).sort());
  for (const metric of [...dashboard.totals, ...row.metrics]) {
    assert.equal(metric.status, 'AVAILABLE', 'P1 Hermes smoke: a real metric is unavailable');
    assert.ok(Number.isSafeInteger(metric.value) && metric.value >= 0, 'P1 Hermes smoke: invalid metric value');
  }
  assert.ok(row.metrics.find(({ key }) => key === 'companies').value >= 1, 'P1 Hermes smoke: persisted synthetic company must be counted');
  for (const total of dashboard.totals) {
    assert.equal(total.value, row.metrics.find(({ key }) => key === total.key).value);
    assert.equal(total.contributingStructures, 1);
    assert.equal(total.totalStructures, 1);
  }
  // Existing table primitives expose these hooks; copy and card markup are not
  // contracts. Column ordering follows the actual metadata totals response.
  const activeRow = page.getByText(row.structure.displayName, { exact: true }).locator('xpath=ancestor::*[@data-table-row][1]');
  await activeRow.waitFor({ state: 'visible', timeout: 30_000 });
  await activeRow.getByText('Current', { exact: true }).waitFor({ state: 'visible' });
  const headerRow = page.locator('[data-table-row]:has([data-table-header])');
  assert.equal(await headerRow.count(), 1, 'P1 Hermes smoke: expected one structures table');
  const table = headerRow.locator('..');
  const headers = await headerRow.locator('[data-table-header]').allTextContents();
  assert.equal(headers.length, 5);
  assert.deepEqual(headers.slice(1).map((value) => value.trim()), dashboard.totals.map(({ key }) => labels[key]));
  const bodyRows = table.locator('[data-table-row]:not(:has([data-table-header]))');
  assert.equal(await bodyRows.count(), dashboard.structures.length + 1);
  const totalRow = bodyRows.first();
  const metricsByKey = new Map(row.metrics.map((metric) => [metric.key, metric]));
  for (const [tableRow, metrics] of [[totalRow, dashboard.totals], [activeRow, dashboard.totals.map(({ key }) => metricsByKey.get(key))]]) {
    const cells = tableRow.locator(':scope > div');
    assert.equal(await cells.count(), 5);
    for (const [index, metric] of metrics.entries()) {
      await cells.nth(index + 1).getByText(new Intl.NumberFormat('en-US').format(metric.value), { exact: true }).first().waitFor({ state: 'visible' });
    }
  }
  assert.equal(await page.getByRole('alert').count(), 0, 'P1 Hermes smoke: an error state is displayed');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, `${name}: structures horizontal overflow`);
  await page.screenshot({ path: path.join(screenshots, `${name}-hermes-structures.png`), fullPage: true });
  hermesEvidence.push({ viewport: name, path: STRUCTURES_PATH, workspaceId: fixture.workspace.id, generatedAt: dashboard.generatedAt, totals: dashboard.totals, active: row.structure.isCurrent });
}


// Contract: Claude 1f60736ed uses /prospection?batch=<id> and accessible Field labels.
// These checks observe the UI's real metadata calls; they never intercept/mock data.
async function readReceptionSafety() {
  const serverRequire = createRequire(path.join(root, 'apps/crm/ui/packages/twenty-server/package.json'));
  const { Client } = serverRequire('pg');
  const client = new Client({ connectionString: process.env.PG_DATABASE_URL, connectionTimeoutMillis: 10_000, statement_timeout: 10_000 });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const result = await client.query('SELECT "databaseSchema" FROM core.workspace WHERE id=$1', [hermesFixture.workspace.id]);
    assert.equal(result.rows.length, 1);
    const schema = result.rows[0].databaseSchema;
    assert.match(schema ?? '', /^[a-zA-Z0-9_]+$/);
    const deliveries = await client.query(`SELECT count(*)::int AS count FROM "${schema}"."campaignDelivery"`);
    const suppressions = await client.query(`SELECT to_jsonb(s) AS row FROM "${schema}"."messageSuppression" s ORDER BY id LIMIT 1001`);
    assert.ok(suppressions.rows.length <= 1000, 'P1 Hermes smoke: unexpected suppression fixture size');
    await client.query('COMMIT');
    return { deliveries: deliveries.rows[0].count, suppressions: suppressions.rows.map(({ row }) => row) };
  } finally { await client.end(); }
}

async function metadataUIResult(page, field, action) {
  const pending = page.waitForResponse((response) => hasOperation(response, field), { timeout: 60_000 });
  await action();
  const response = await pending;
  let body;
  try { body = await response.json(); } catch {
    failGraphql(graphqlDiagnostic('metadata', `query ${field}`, response.status(), undefined, 'invalid-json'));
  }
  if (response.status() !== 200 || body?.errors?.length) {
    failGraphql(graphqlDiagnostic('metadata', `query ${field}`, response.status(), body, response.status() === 200 ? 'graphql' : 'http'));
  }
  assert.ok(body.data?.[field] && typeof body.data[field] === 'object', `P1 Hermes smoke: ${field} payload missing`);
  return body.data[field];
}

async function checkHermesReception(page, name) {
  const fixture = hermesFixture;
  const before = await readReceptionSafety();
  assert.equal(before.deliveries, 0, 'P1 Hermes smoke: disposable workspace already has deliveries');
  const forbiddenOperations = [];
  const rejectSending = async (route) => {
    let payload;
    try { payload = route.request().postDataJSON(); } catch { return route.continue(); }
    const queries = [payload].flat().map((operation) => operation?.query ?? '').join('\n');
    if (/\b(?:send|schedule)[A-Za-z0-9_]*\s*\(/i.test(queries)) {
      forbiddenOperations.push('campaign-send-or-schedule');
      return route.abort('blockedbyclient');
    }
    return route.continue();
  };
  await page.route(`${APP_API_ORIGIN}/**`, rejectSending);
  try {
    const initial = await metadataUIResult(page, 'hermesImportBatches', () => page.goto(`${FRONTEND_ORIGIN}/prospection`, { waitUntil: 'domcontentloaded' }));
    assert.equal(initial.version, 1);
    assert.ok(Array.isArray(initial.batches));
    assert.equal(initial.capabilities.nativeCampaignDrafts, true);
    assert.equal(initial.capabilities.smtpCampaignSending, false);
    const suffix = `${name}-${randomBytes(4).toString('hex')}`;
    const email = `p1-reception-${suffix}@example.test`;
    const batchName = `P1 synthetic reception ${suffix}`;
    await page.getByLabel('Batch name', { exact: true }).fill(batchName);
    await page.getByLabel('Batch id', { exact: true }).fill(`p1-${process.env.GITHUB_RUN_ID}-${suffix}`);
    await page.getByLabel('Source URL', { exact: true }).fill('https://example.test/synthetic-directory');
    await page.getByLabel('Collected on', { exact: true }).fill('2026-10-29T12:00');
    await page.getByLabel('Rows', { exact: true }).fill(JSON.stringify([{ email, companyName: `Synthetic ${suffix}`, firstName: 'Synthetic', lastName: 'Browser' }]));
    const created = await metadataUIResult(page, 'hermesCreateImportBatch', () => page.getByRole('button', { name: 'Stage batch', exact: true }).click());
    assert.ok(created.batch?.id && created.batch.rows?.length === 1);
    const batch = created.batch;
    const staged = batch.rows[0];
    assert.equal(staged.email, email);
    assert.equal(staged.status, 'pending');
    // Click the real table link instead of navigating directly to a fabricated detail.
    const batchLink = page.getByRole('link').filter({ hasText: batchName });
    await batchLink.waitFor({ state: 'visible', timeout: 30_000 });
    await batchLink.click();
    await page.waitForURL((url) => url.pathname === '/prospection' && url.searchParams.get('batch') === batch.id);
    await page.getByRole('checkbox', { name: 'Select row', exact: true }).check();
    const professionalPurpose = 'Synthetic B2B browser verification only; no contact or delivery is authorized.';
    await page.getByLabel('Professional purpose', { exact: true }).fill(professionalPurpose);
    await page.getByLabel('Privacy notice URL', { exact: true }).fill('https://example.test/privacy');
    await page.getByRole('radio', { name: 'Notice given at first contact', exact: true }).check();
    const reloaded = page.waitForResponse((response) => hasOperation(response, 'hermesImportBatches'), { timeout: 60_000 });
    const qualified = await metadataUIResult(page, 'hermesQualifyImportRows', () => page.getByRole('button', { name: 'Qualify', exact: true }).click());
    assert.equal(qualified.batchId, batch.id);
    assert.equal(qualified.rows?.length, 1);
    const row = qualified.rows[0];
    assert.equal(row.id, staged.id);
    assert.equal(row.status, 'qualified');
    assert.ok(row.personId);
    assert.equal(row.qualification.professionalPurpose, professionalPurpose);
    assert.equal(row.qualification.privacyNoticeUrl, 'https://example.test/privacy');
    assert.equal(row.qualification.informationMethod, 'first-contact-notice');
    // Await and verify the actual reload before invoking a draft mutation.
    const reloadResponse = await reloaded;
    assert.equal(reloadResponse.status(), 200);
    const reloadBody = await reloadResponse.json();
    assert.ok(!reloadBody.errors?.length);
    assert.equal(reloadBody.data?.hermesImportBatches?.batches.find(({ id }) => id === batch.id)?.rows.find(({ id }) => id === row.id)?.status, 'qualified');
    await page.getByRole('checkbox', { name: 'Select row', exact: true }).waitFor({ state: 'visible' });
    // A frontend remount may intentionally reset selection; selecting again is
    // a real user action, not permission/state bypass.
    await page.getByRole('checkbox', { name: 'Select row', exact: true }).check();
    await page.getByLabel('Campaign name', { exact: true }).fill(`Synthetic draft ${suffix}`);
    await page.getByLabel('Subject', { exact: true }).fill('Synthetic draft only — do not send');
    const draft = await metadataUIResult(page, 'hermesCreateCampaignDraft', () => page.getByRole('button', { name: 'Create draft', exact: true }).click());
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.sendingAvailable, false);
    assert.ok(draft.campaignId && draft.listId);
    await page.getByText('Draft created. Nothing was sent.', { exact: true }).waitFor({ state: 'visible' });
    const persisted = await graphql('graphql', 'query P1ReceptionPerson($filter:PersonFilterInput!) { people(filter:$filter,first:2) { edges { node { id emails { primaryEmail } } } } }', { filter: { id: { eq: row.personId } } }, fixture.token);
    assert.deepEqual(persisted.people.edges.map(({ node }) => node), [{ id: row.personId, emails: { primaryEmail: email } }]);
    const campaign = await graphql('graphql', 'query P1ReceptionDraft($filter:MessageCampaignFilterInput!) { messageCampaigns(filter:$filter,first:2) { edges { node { id status listId } } } }', { filter: { id: { eq: draft.campaignId } } }, fixture.token);
    assert.deepEqual(campaign.messageCampaigns.edges.map(({ node }) => node), [{ id: draft.campaignId, status: 'DRAFT', listId: draft.listId }]);
    const saved = await graphql('metadata', 'query P1ReceptionSaved { hermesImportBatches }', {}, fixture.token);
    const savedRow = saved.hermesImportBatches.batches.find(({ id }) => id === batch.id)?.rows.find(({ id }) => id === row.id);
    assert.equal(savedRow?.status, 'qualified');
    assert.equal(savedRow?.personId, row.personId);
    assert.deepEqual(await readReceptionSafety(), before, 'P1 Hermes smoke: delivery or suppression register changed');
    assert.deepEqual(forbiddenOperations, []);
    assert.equal(await page.getByRole('alert').count(), 0, 'P1 Hermes smoke: reception error displayed');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, `${name}: reception horizontal overflow`);
    await page.screenshot({ path: path.join(screenshots, `${name}-hermes-reception-draft.png`), fullPage: true });
    hermesEvidence.push({ viewport: name, path: '/prospection', batchId: batch.id, rowId: row.id, personId: row.personId, campaignId: draft.campaignId, status: draft.status, deliveries: 0, suppressionRegisterUnchanged: true });
  } finally { await page.unroute(`${APP_API_ORIGIN}/**`, rejectSending); }
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (preview.exitCode !== null) throw new Error(`Preview exited: ${previewLog}`);
    try {
      const response = await fetch('http://127.0.0.1:3001/welcome', { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* The preview server may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, `Frontend preview timed out: ${previewLog}`);
  browser = await chromium.launch({ headless: true });
  if (hermesSmoke) await prepareHermesFixture();
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, locale: 'en-US', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const failedAssets = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().startsWith('http://127.0.0.1:3001/') && /\.(?:js|css|woff2?)(?:\?|$)/.test(response.url()) && response.status() >= 400) {
        failedAssets.push(`${response.status()} ${response.url()}`);
      }
    });
    try {
      const configResponse = page.waitForResponse((response) => response.url().startsWith(`${APP_API_ORIGIN}/client-config`) && response.status() === 200, { timeout: 60_000 });
      await page.goto('http://127.0.0.1:3001/welcome', { waitUntil: 'domcontentloaded' });
      await configResponse;
      const continueWithEmail = page.getByRole('button', { name: 'Continue with Email', exact: true });
      await continueWithEmail.waitFor({ state: 'visible', timeout: 60_000 });
      await page.screenshot({ path: path.join(screenshots, `${name}-welcome.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      assert.equal(overflow, false, `${name}: horizontal overflow`);
      await continueWithEmail.click();
      const email = page.getByPlaceholder('Email', { exact: true });
      await email.waitFor({ state: 'visible' });
      await email.fill('invalid-email');
      assert.equal(await email.inputValue(), 'invalid-email');
      await page.screenshot({ path: path.join(screenshots, `${name}-email.png`), fullPage: true });
      if (hermesSmoke) {
        await checkHermesDashboard(page, name);
        await checkHermesReception(page, name);
      }
      assert.deepEqual(errors, [], `${name}: uncaught browser errors`);
      assert.deepEqual(failedAssets, [], `${name}: failed script/style/font assets`);
    } catch (error) {
      await page.screenshot({ path: path.join(screenshots, `${name}-failure.png`), fullPage: true }).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
  console.info('P0 browser: real client-config, desktop/mobile welcome and email step, assets and overflow verified');
  if (hermesSmoke) {
    writeFileSync(path.join(screenshots, 'hermes-structures.json'), `${JSON.stringify(hermesEvidence, null, 2)}\n`);
    console.info('P1 Hermes browser: real onboarding/UI sign-in, dashboard response/counts, real reception import/qualification/DRAFT, native persistence and zero delivery verified on desktop/mobile');
  }
} finally {
  await browser?.close().catch(() => {});
  try {
    if (hermesFixture?.companyAttempted && hermesFixture.token) {
      const deleted = await graphql('graphql', 'mutation P1Cleanup($id:UUID!) { deleteCompany(id:$id) { id } }', { id: hermesFixture.companyId }, hermesFixture.token);
      assert.equal(deleted.deleteCompany.id, hermesFixture.companyId, 'P1 Hermes smoke: fixture cleanup failed');
      const remaining = await graphql('graphql', 'query P1CleanupRead($filter:CompanyFilterInput!) { companies(filter:$filter,first:1) { edges { node { id } } } }', { filter: { id: { eq: hermesFixture.companyId } } }, hermesFixture.token);
      assert.deepEqual(remaining.companies.edges, [], 'P1 Hermes smoke: fixture deletion was not persisted');
    }
  } finally {
    preview.kill('SIGTERM');
    const killTimer = setTimeout(() => preview.kill('SIGKILL'), 5000);
    killTimer.unref();
    writeFileSync(indexPath, originalIndex);
  }
}
