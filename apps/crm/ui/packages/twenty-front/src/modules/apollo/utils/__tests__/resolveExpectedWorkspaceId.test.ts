import { resolveExpectedWorkspaceId } from '@/apollo/utils/resolveExpectedWorkspaceId';

describe('resolveExpectedWorkspaceId', () => {
  // A cold reload can hold a stale workspace while the cookie points
  // elsewhere. Asserting the stale one loops on a superseded session.
  it('omits the header when the caller explicitly passes null', () => {
    expect(resolveExpectedWorkspaceId(null, 'ws-a')).toBeNull();
  });

  it('falls back to the pinned workspace when the caller says nothing', () => {
    expect(resolveExpectedWorkspaceId(undefined, 'ws-a')).toBe('ws-a');
  });

  it('lets the caller name another workspace', () => {
    expect(resolveExpectedWorkspaceId('ws-b', 'ws-a')).toBe('ws-b');
  });

  it.each(['', '  ', 7, {}])(
    'keeps the pinned workspace for the unusable value %p',
    (value) => {
      expect(resolveExpectedWorkspaceId(value, 'ws-a')).toBe('ws-a');
    },
  );

  it('sends nothing when neither is known', () => {
    expect(resolveExpectedWorkspaceId(undefined, null)).toBeNull();
  });
});
