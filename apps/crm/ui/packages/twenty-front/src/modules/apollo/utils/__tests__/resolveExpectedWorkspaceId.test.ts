import { resolveExpectedWorkspaceId } from '@/apollo/utils/resolveExpectedWorkspaceId';

describe('resolveExpectedWorkspaceId', () => {
  it('falls back to the workspace this client was built for', () => {
    expect(resolveExpectedWorkspaceId(undefined, 'ws-a')).toBe('ws-a');
  });

  // An explicit value wins: the bootstrap after a switch acts on B while the
  // client it borrows was still built for A.
  it('lets the caller override the instance workspace', () => {
    expect(resolveExpectedWorkspaceId('ws-b', 'ws-a')).toBe('ws-b');
  });

  it.each([null, '', '  ', 7, {}])(
    'ignores %p and keeps the instance workspace',
    (value) => {
      expect(resolveExpectedWorkspaceId(value, 'ws-a')).toBe('ws-a');
    },
  );

  it('sends nothing when neither is known', () => {
    expect(resolveExpectedWorkspaceId(undefined, null)).toBeNull();
  });
});
