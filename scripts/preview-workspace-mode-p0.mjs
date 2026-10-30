import assert from 'node:assert/strict';

// Only the explicit preview workflow choice controls this mode. Ambient application
// flags never enable subdomains or opt a legacy preview into the new auth flow.
export const previewWorkspaceModeEnvironment = (source = {}) => {
  const option = source.P0_PREVIEW_SAME_ORIGIN_WORKSPACES;
  assert.ok(
    option === undefined || option === 'false' || option === 'true',
    'Same-origin workspace preview option must be true or false',
  );
  return {
    IS_MULTIWORKSPACE_ENABLED: 'false',
    IS_SAME_ORIGIN_MULTIWORKSPACE_ENABLED: option === 'true' ? 'true' : 'false',
  };
};
