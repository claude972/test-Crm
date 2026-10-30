import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { previewWorkspaceModeEnvironment } from './preview-workspace-mode-p0.mjs';

test('legacy preview stays disabled despite ambient application opt-in or subdomain flags', () => {
  for (const explicit of [undefined, 'false']) {
    assert.deepEqual(previewWorkspaceModeEnvironment({
      P0_PREVIEW_SAME_ORIGIN_WORKSPACES: explicit,
      IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED: 'true',
      IS_MULTIWORKSPACE_ENABLED: 'true',
    }), { IS_MULTIWORKSPACE_ENABLED: 'false', IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED: 'false' });
  }
});
test('only the explicit preview option enables same-origin auth while preserving single-origin routing', () => {
  assert.deepEqual(previewWorkspaceModeEnvironment({P0_PREVIEW_SAME_ORIGIN_WORKSPACES:'true'}), {
    IS_MULTIWORKSPACE_ENABLED:'false', IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED:'true',
  });
});
test('invalid preview options are rejected without reflecting their input', () => {
  for (const value of ['1','TRUE','yes','',true,false,null,{},'synthetic-private-value']) {
    assert.throws(() => previewWorkspaceModeEnvironment({P0_PREVIEW_SAME_ORIGIN_WORKSPACES:value}), error => error.message === 'Same-origin workspace preview option must be true or false');
  }
});
test('the supervisor overrides ambient app flags and preserves canonical URL and restart/secret flow', () => {
  const source = readFileSync(new URL('./preview-backend-session-p0.mjs',import.meta.url),'utf8');
  assert.match(source,/\.\.\.process\.env,\s*\.\.\.workspaceModeEnvironment,/);
  assert.match(source,/assert\.equal\(serverUrl, frontendUrl,/);
  assert.match(source,/APP_SECRET: appSecret/);
  assert.match(source,/without database initialization/);
  assert.match(source,/EMAILING_DOMAIN_DRIVER: 'SMTP', EMAILING_SMTP_CONNECTIONS: '\{\}'/);
  assert.match(source,/config\.isSameOriginMultiWorkspaceEnabled, true/);
});
test('workflow defaults off and opts in only on explicit workflow_dispatch input', () => {
  const source = readFileSync(new URL('../.github/workflows/p0-preview-session.yml',import.meta.url),'utf8');
  assert.match(source,/same-origin-workspaces:[\s\S]*?type: boolean\s+default: false/);
  assert.match(source,/P0_PREVIEW_SAME_ORIGIN_WORKSPACES: \$\{\{ github.event_name == 'workflow_dispatch' && inputs.same-origin-workspaces && 'true' \|\| 'false' \}\}/);
});
