import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';

describe('parseConnectorCheckedAt', () => {
  it('reports a missing timestamp as never checked', () => {
    expect(parseConnectorCheckedAt(null)).toEqual({ kind: 'never' });
    expect(parseConnectorCheckedAt(undefined)).toEqual({ kind: 'never' });
    expect(parseConnectorCheckedAt('   ')).toEqual({ kind: 'never' });
  });

  it('does not pass a never-checked connector off as checked', () => {
    expect(parseConnectorCheckedAt(null).kind).not.toBe('at');
  });

  it('separates an unreadable timestamp from never having been checked', () => {
    expect(parseConnectorCheckedAt('not a date')).toEqual({
      kind: 'unreadable',
    });
  });

  it('keeps a usable instant', () => {
    const parsed = parseConnectorCheckedAt('2026-10-29T08:30:00.000Z');

    expect(parsed.kind).toBe('at');
    expect(parsed.kind === 'at' && parsed.date.toISOString()).toBe(
      '2026-10-29T08:30:00.000Z',
    );
  });
});
