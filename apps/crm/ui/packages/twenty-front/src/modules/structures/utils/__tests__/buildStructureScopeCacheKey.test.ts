import { buildStructureScopeCacheKey } from '@/structures/utils/buildStructureScopeCacheKey';

const SESSION = 'session-1';

describe('buildStructureScopeCacheKey', () => {
  it('separates two sessions so a re-login never reads the previous scope', () => {
    const first = buildStructureScopeCacheKey({ sessionKey: 'session-1' });
    const second = buildStructureScopeCacheKey({ sessionKey: 'session-2' });

    expect(first).not.toEqual(second);
  });

  it('treats the same structures in any order as one scope', () => {
    expect(
      buildStructureScopeCacheKey({
        sessionKey: SESSION,
        workspaceIds: ['b', 'a'],
      }),
    ).toEqual(
      buildStructureScopeCacheKey({
        sessionKey: SESSION,
        workspaceIds: ['a', 'b'],
      }),
    );
  });

  it('ignores a repeated structure id', () => {
    expect(
      buildStructureScopeCacheKey({
        sessionKey: SESSION,
        workspaceIds: ['a', 'a', 'b'],
      }),
    ).toEqual(
      buildStructureScopeCacheKey({
        sessionKey: SESSION,
        workspaceIds: ['a', 'b'],
      }),
    );
  });

  it('keeps an omitted scope distinct from an explicit list, because the server resolves the authorised set', () => {
    const omitted = buildStructureScopeCacheKey({ sessionKey: SESSION });
    const explicit = buildStructureScopeCacheKey({
      sessionKey: SESSION,
      workspaceIds: ['a'],
    });

    expect(omitted).not.toEqual(explicit);
  });

  it('keeps the empty scope distinct from an omitted one', () => {
    const omitted = buildStructureScopeCacheKey({ sessionKey: SESSION });
    const empty = buildStructureScopeCacheKey({
      sessionKey: SESSION,
      workspaceIds: [],
    });

    expect(empty).not.toEqual(omitted);
  });

  it('separates two periods over the same structures', () => {
    const january = buildStructureScopeCacheKey({
      sessionKey: SESSION,
      workspaceIds: ['a'],
      periodStart: '2026-01-01T00:00:00.000Z',
      periodEnd: '2026-02-01T00:00:00.000Z',
    });
    const february = buildStructureScopeCacheKey({
      sessionKey: SESSION,
      workspaceIds: ['a'],
      periodStart: '2026-02-01T00:00:00.000Z',
      periodEnd: '2026-03-01T00:00:00.000Z',
    });

    expect(january).not.toEqual(february);
  });

  it('separates a bounded period from an unbounded one', () => {
    const unbounded = buildStructureScopeCacheKey({
      sessionKey: SESSION,
      workspaceIds: ['a'],
    });
    const bounded = buildStructureScopeCacheKey({
      sessionKey: SESSION,
      workspaceIds: ['a'],
      periodStart: '2026-01-01T00:00:00.000Z',
    });

    expect(unbounded).not.toEqual(bounded);
  });
});
