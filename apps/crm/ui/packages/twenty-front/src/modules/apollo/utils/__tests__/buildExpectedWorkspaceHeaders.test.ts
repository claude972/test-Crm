import {
  buildExpectedWorkspaceHeaders,
  EXPECTED_WORKSPACE_ID_HEADER,
} from '@/apollo/utils/buildExpectedWorkspaceHeaders';

describe('buildExpectedWorkspaceHeaders', () => {
  it('sends the captured workspace', () => {
    expect(buildExpectedWorkspaceHeaders('ws-b')).toEqual({
      [EXPECTED_WORKSPACE_ID_HEADER]: 'ws-b',
    });
  });

  // No value means no header: an absent expectation must never be filled in
  // from the currently active workspace.
  it.each([undefined, null, '', '   ', 42, {}])(
    'sends nothing for %p',
    (value) => {
      expect(buildExpectedWorkspaceHeaders(value)).toEqual({});
    },
  );
});
