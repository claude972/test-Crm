import { formatHermesWaDuration } from '@/hermes-wa-ui/utils/formatHermesWaDuration';

describe('formatHermesWaDuration', () => {
  it('does not turn an absent duration into zero seconds', () => {
    expect(formatHermesWaDuration(null)).toBeNull();
    expect(formatHermesWaDuration(undefined)).toBeNull();
  });

  it('refuses a value that is not a duration instead of clamping it', () => {
    expect(formatHermesWaDuration(-1)).toBeNull();
    expect(formatHermesWaDuration(Number.NaN)).toBeNull();
    expect(formatHermesWaDuration(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('keeps a real zero as zero', () => {
    expect(formatHermesWaDuration(0)).toBe('0:00');
  });

  it('pads the seconds', () => {
    expect(formatHermesWaDuration(4000)).toBe('0:04');
    expect(formatHermesWaDuration(65_000)).toBe('1:05');
  });

  it('does not reach the next second before it is over', () => {
    expect(formatHermesWaDuration(999)).toBe('0:00');
    expect(formatHermesWaDuration(1999)).toBe('0:01');
  });

  it('adds hours only past the hour', () => {
    expect(formatHermesWaDuration(59 * 60 * 1000 + 59_000)).toBe('59:59');
    expect(formatHermesWaDuration(60 * 60 * 1000)).toBe('1:00:00');
    expect(formatHermesWaDuration(3 * 60 * 60 * 1000 + 7 * 60 * 1000 + 5000)).toBe(
      '3:07:05',
    );
  });
});
