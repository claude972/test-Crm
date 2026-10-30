import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { open, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const options = {};
const keys = ['url', 'run-id', 'run-metadata', 'credentials', 'result'];
assert.equal(args.length, keys.length * 2, 'Provide URL, run-id, run-metadata, credentials and result');
for (let index = 0; index < args.length; index += 2) {
  const key = args[index].replace(/^--/, '');
  assert.ok(args[index].startsWith('--') && keys.includes(key) && !Object.hasOwn(options, key), 'Invalid or duplicate option');
  options[key] = args[index + 1];
}
const deployment = new URL(options.url);
assert.equal(deployment.protocol, 'https:');
assert.ok(deployment.hostname.endsWith('.vercel.app'), 'Only an isolated Vercel deployment is allowed');
assert.ok(!deployment.username && !deployment.password && !deployment.port && !deployment.search && !deployment.hash);
assert.equal(deployment.pathname, '/');
assert.match(options['run-id'], /^\d{8,20}$/, 'Explicit GitHub run ID required');
assert.ok(path.isAbsolute(options['run-metadata']), 'Run metadata must be an absolute path');
const metadata = JSON.parse(await readFile(options['run-metadata'], 'utf8'));
assert.equal(metadata.environment, 'preview');
assert.equal(metadata.deploymentUrl, deployment.origin, 'Deployment must match root run metadata exactly');
assert.equal(String(metadata.runId), options['run-id']);
assert.match(metadata.sha, /^[a-f0-9]{40}$/);
const expiresAt = Date.parse(metadata.expiresAt);
assert.ok(Number.isFinite(expiresAt) && expiresAt > Date.now() + 5 * 60_000 && expiresAt <= Date.now() + 90 * 60_000,
  'A live preview session with at least five minutes remaining is required');
for (const key of ['credentials', 'result']) assert.ok(path.isAbsolute(options[key]), `${key} must be an absolute path`);
assert.notEqual(options.credentials, options.result);
const credentialsDirectory = await realpath(path.dirname(options.credentials));
assert.ok(credentialsDirectory !== root && !credentialsDirectory.startsWith(`${root}${path.sep}`), 'Credentials must stay outside the repository');
const repositoryCheck = spawnSync('git', ['-C', credentialsDirectory, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
assert.notEqual(repositoryCheck.status, 0, 'Credentials must stay outside every Git worktree');
assert.ok((await stat(credentialsDirectory)).isDirectory());

const report = {
  deploymentUrl: deployment.origin, runId: options['run-id'], sha: metadata.sha,
  expiresAt: metadata.expiresAt, startedAt: new Date().toISOString(), status: 'running', steps: [],
};
// Exclusive files prevent accidental reuse of an account or overwrite of prior evidence.
const reportHandle = await open(options.result, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
let token;
let companyAttempted = false;
let companyDeleted = false;
const companyId = randomUUID();
const companyName = `P0 synthetic ${options['run-id']} ${randomBytes(4).toString('hex')}`;
let currentStep = 'preflight';
const quote = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\r', '\\r').replaceAll('\n', '\\n')}"`;
function failure(code) { const error = new Error(code); error.safeCode = code; return error; }
function request(endpoint, query, variables = {}, accessToken, timeoutSeconds = 45) {
  if (Date.now() >= expiresAt - 5000) throw failure('SESSION_EXPIRED');
  const remaining = Math.floor((expiresAt - Date.now()) / 1000) - 2;
  const timeout = Math.min(timeoutSeconds, remaining);
  const config = [
    'silent', 'show-error', 'fail-with-body', 'max-redirs = 0',
    `connect-timeout = 15`, `max-time = ${timeout}`, 'proto = "=https"',
    `header = ${quote(`Origin: ${deployment.origin}`)}`,
    `write-out = ${quote('\n%{http_code}')}`,
  ];
  if (query) {
    config.push('request = "POST"', 'header = "Content-Type: application/json"');
    config.push(`data-binary = ${quote(JSON.stringify({ query, variables }))}`);
  }
  if (accessToken) config.push(`header = ${quote(`Authorization: Bearer ${accessToken}`)}`);
  // The authenticated Vercel CLI manages Deployment Protection. Application
  // credentials and GraphQL variables enter curl only through stdin.
  const result = spawnSync('vercel', ['curl', endpoint, '--deployment', deployment.origin, '--', '--config', '-'], {
    cwd: root, input: `${config.join('\n')}\n`, encoding: 'utf8', timeout: (timeout + 30) * 1000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const match = result.stdout?.match(/\n(\d{3})\s*$/);
  if (result.error || result.status !== 0 || !match || match[1] !== '200') throw failure(`HTTP_${match?.[1] ?? 'TRANSPORT'}`);
  let body;
  try { body = JSON.parse(result.stdout.slice(0, match.index)); } catch { throw failure('INVALID_JSON'); }
  if (body.errors?.length) {
    const safeCodes = new Set(['UNAUTHENTICATED', 'FORBIDDEN', 'BAD_USER_INPUT', 'INTERNAL_SERVER_ERROR', 'GRAPHQL_VALIDATION_FAILED', 'GRAPHQL_PARSE_FAILED']);
    const code = body.errors[0]?.extensions?.code;
    throw failure(safeCodes.has(code) ? code : 'GRAPHQL_ERROR');
  }
  return query ? body.data : body;
}
async function step(name, operation) {
  currentStep = name;
  const result = await operation();
  report.steps.push({ name, status: 'passed' });
  console.info(`P0 preview smoke: ${name} passed`);
  return result;
}
const COMPANY_QUERY = 'query P0Company($filter: CompanyFilterInput!) { company(filter: $filter) { id name } }';
const findCompany = () => request('/graphql', COMPANY_QUERY, { filter: { id: { eq: companyId } } }, token).company;

try {
  await step('public_configuration', () => {
    const config = request('/client-config');
    assert.equal(config.authProviders.password, true);
    assert.equal(config.isEmailVerificationRequired, false);
    assert.equal(config.isMultiWorkspaceEnabled, false);
    assert.equal(config.billing.isBillingEnabled, false);
    assert.equal(new URL(config.serverUrl).origin, deployment.origin);
  });
  const email = `preview-${options['run-id']}@example.com`;
  const password = randomBytes(24).toString('base64url');
  assert.match(email, /^preview-\d{8,20}@example\.com$/);
  currentStep = 'private_credentials';
  const credentials = await open(options.credentials, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    await credentials.writeFile(JSON.stringify({ deploymentUrl: deployment.origin, runId: options['run-id'], expiresAt: metadata.expiresAt, email, password }));
  } finally { await credentials.close(); }
  report.steps.push({ name: 'private_credentials', status: 'passed' });
  await step('fresh_synthetic_signup', () => {
    const data = request('/metadata', `mutation P0SignUp($email:String!,$password:String!) {
      signUp(email:$email,password:$password) { tokens { accessOrWorkspaceAgnosticToken { token } } }
    }`, { email, password });
    token = data.signUp.tokens.accessOrWorkspaceAgnosticToken.token;
    assert.ok(typeof token === 'string' && token.length > 20);
  });
  const workspace = await step('create_workspace', () => request('/metadata', `mutation P0Workspace($input:SignUpInNewWorkspaceInput) {
    signUpInNewWorkspace(input:$input) { loginToken { token } workspace { id workspaceUrls { subdomainUrl customUrl } } }
  }`, { input: { displayName: `Recette P0 ${options['run-id']}` } }, token).signUpInNewWorkspace);
  assert.equal(new URL(workspace.workspace.workspaceUrls.customUrl ?? workspace.workspace.workspaceUrls.subdomainUrl).origin, deployment.origin);
  await step('workspace_login_exchange', () => {
    const data = request('/metadata', `mutation P0Login($loginToken:String!,$origin:String!) {
      getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin) { tokens { accessOrWorkspaceAgnosticToken { token } } }
    }`, { loginToken: workspace.loginToken.token, origin: deployment.origin });
    token = data.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token;
    assert.ok(typeof token === 'string' && token.length > 20);
  });
  await step('activate_workspace', () => {
    const data = request('/metadata', `mutation P0Activate($input:ActivateWorkspaceInput!) {
      activateWorkspace(data:$input) { id activationStatus }
    }`, { input: {} }, token, 180);
    assert.equal(data.activateWorkspace.id, workspace.workspace.id);
    assert.ok(['CREATED', 'ACTIVE'].includes(data.activateWorkspace.activationStatus));
  });
  await step('skip_email_connection', () => {
    const data = request('/metadata', 'mutation { skipSyncEmailOnboardingStep(isAutoSkipped:true) { success } }', {}, token);
    assert.equal(data.skipSyncEmailOnboardingStep.success, true);
  });
  const profileFilter = { userEmail: { eq: email } };
  const PROFILE_QUERY = `query P0Profile($filter:WorkspaceMemberFilterInput!) {
    workspaceMember(filter:$filter) { id name { firstName lastName } }
  }`;
  await step('save_and_verify_demo_profile', () => {
    const member = request('/graphql', PROFILE_QUERY, { filter: profileFilter }, token).workspaceMember;
    assert.ok(member?.id);
    const data = request('/metadata', `mutation P0ProfileUpdate($input:UpdateWorkspaceMemberSettingsInput!) {
      updateWorkspaceMemberSettings(input:$input)
    }`, { input: { workspaceMemberId: member.id, update: { name: { firstName: 'Preview', lastName: 'P0' } } } }, token);
    assert.equal(data.updateWorkspaceMemberSettings, true);
    const saved = request('/graphql', PROFILE_QUERY, { filter: profileFilter }, token).workspaceMember;
    assert.equal(saved.name.firstName, 'Preview');
    assert.equal(saved.name.lastName, 'P0');
  });
  await step('skip_invitations_without_recipients', () => {
    const data = request('/metadata', 'mutation { sendInvitations(emails:[]) { success errors result { id } } }', {}, token);
    assert.equal(data.sendInvitations.success, true);
    assert.deepEqual(data.sendInvitations.errors, []);
    assert.deepEqual(data.sendInvitations.result, []);
  });
  await step('verify_onboarding_completed', () => {
    const data = request('/metadata', 'query { currentUser { onboardingStatus } }', {}, token);
    assert.equal(data.currentUser.onboardingStatus, 'COMPLETED');
  });
  await step('company_create_and_read', () => {
    companyAttempted = true;
    const data = request('/graphql', `mutation P0CreateCompany($input:CompanyCreateInput!) {
      createCompany(data:$input) { id name }
    }`, { input: { id: companyId, name: companyName } }, token);
    assert.equal(data.createCompany.id, companyId);
    const saved = findCompany();
    assert.equal(saved.id, companyId);
    assert.equal(saved.name, companyName);
  });
  await step('company_update_and_read', () => {
    const data = request('/graphql', `mutation P0UpdateCompany($id:UUID!,$data:CompanyUpdateInput!) {
      updateCompany(id:$id,data:$data) { id name }
    }`, { id: companyId, data: { name: `${companyName} updated` } }, token);
    assert.equal(data.updateCompany.id, companyId);
    assert.equal(findCompany().name, `${companyName} updated`);
  });
  await step('company_delete_and_verify', () => {
    const data = request('/graphql', 'mutation P0DeleteCompany($id:UUID!) { deleteCompany(id:$id) { id } }', { id: companyId }, token);
    assert.equal(data.deleteCompany.id, companyId);
    assert.equal(findCompany(), null);
    companyDeleted = true;
  });
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.steps.push({ name: currentStep, status: 'failed', code: error.safeCode ?? 'ASSERTION_FAILED' });
  process.exitCode = 1;
} finally {
  if (companyAttempted && !companyDeleted && token) {
    try {
      const existing = findCompany();
      if (existing) {
        assert.equal(existing.id, companyId);
        assert.ok(existing.name === companyName || existing.name === `${companyName} updated`);
        request('/graphql', 'mutation P0CleanupCompany($id:UUID!) { deleteCompany(id:$id) { id } }', { id: companyId }, token);
        assert.equal(findCompany(), null);
      }
      report.steps.push({ name: 'company_failure_cleanup', status: 'passed' });
    } catch {
      report.steps.push({ name: 'company_failure_cleanup', status: 'failed', code: 'CLEANUP_NOT_VERIFIED' });
      report.status = 'failed';
      process.exitCode = 1;
    }
  }
  token = undefined;
  report.finishedAt = new Date().toISOString();
  await reportHandle.writeFile(`${JSON.stringify(report, null, 2)}\n`);
  await reportHandle.close();
  console.info(`P0 preview smoke: ${report.status}; redacted evidence written`);
}
