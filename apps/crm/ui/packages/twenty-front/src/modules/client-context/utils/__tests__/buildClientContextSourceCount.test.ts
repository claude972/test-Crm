import { buildClientContextSourceCount } from '@/client-context/utils/buildClientContextSourceCount';

describe('buildClientContextSourceCount', () => {
  it('counts a source that was read, zero included', () => {
    expect(buildClientContextSourceCount({ kind: 'read', entries: [] })).toEqual(
      { status: 'exact', value: 0 },
    );
    expect(
      buildClientContextSourceCount({ kind: 'read', entries: [1, 2, 3] }),
    ).toEqual({ status: 'exact', value: 3 });
  });

  it('carries no value while the source is still being read', () => {
    expect(buildClientContextSourceCount({ kind: 'loading' })).toEqual({
      status: 'loading',
      value: null,
    });
  });

  // The defect this guards against: an unpublished contract, a refusal or an
  // unreadable payload rendering as "0 responses" on a client record.
  it.each([
    { kind: 'recorded-in-notes' } as const,
    { kind: 'denied' } as const,
    { kind: 'not-configured' } as const,
    { kind: 'unreadable', problem: 'missing' } as const,
  ])('never reports %p as a zero', (state) => {
    const count = buildClientContextSourceCount(state);

    expect(count.status).toBe('unavailable');
    expect(count.value).toBeNull();
    expect(count.value).not.toBe(0);
  });
});
