import {
  readHermesMailboxCount,
  readHermesMailboxFileSize,
} from '@/hermes-mailbox-ui/utils/readHermesMailboxCount';

describe('readHermesMailboxCount', () => {
  it('should keep a real count, zero included', () => {
    expect(readHermesMailboxCount(0)).toEqual({ kind: 'known', value: 0 });
    expect(readHermesMailboxCount(12)).toEqual({ kind: 'known', value: 12 });
  });

  // The rule the folder panel exists to enforce: an operator who reads
  // "0 unread" stops looking, so a figure nobody sent must not become zero.
  it('should leave a missing count unknown rather than defaulting it to zero', () => {
    expect(readHermesMailboxCount(null)).toEqual({ kind: 'unknown' });
    expect(readHermesMailboxCount(undefined)).toEqual({ kind: 'unknown' });
  });

  it('should refuse to repair a figure instead of printing it as the server s', () => {
    expect(readHermesMailboxCount(Number.NaN)).toEqual({ kind: 'unknown' });
    expect(readHermesMailboxCount(Number.POSITIVE_INFINITY)).toEqual({
      kind: 'unknown',
    });
    expect(readHermesMailboxCount(3.5)).toEqual({ kind: 'unknown' });
    expect(readHermesMailboxCount(-1)).toEqual({ kind: 'unknown' });
  });
});

describe('readHermesMailboxFileSize', () => {
  it('should keep a zero-byte file as a known size, because an empty file is real', () => {
    expect(readHermesMailboxFileSize(0)).toEqual({
      kind: 'known',
      value: 0,
      unit: 'byte',
    });
  });

  it('should pick the unit from the magnitude', () => {
    expect(readHermesMailboxFileSize(900)).toEqual({
      kind: 'known',
      value: 900,
      unit: 'byte',
    });
    expect(readHermesMailboxFileSize(2500)).toEqual({
      kind: 'known',
      value: 3,
      unit: 'kilobyte',
    });
    expect(readHermesMailboxFileSize(2_500_000)).toEqual({
      kind: 'known',
      value: 2.5,
      unit: 'megabyte',
    });
    expect(readHermesMailboxFileSize(3_000_000_000)).toEqual({
      kind: 'known',
      value: 3,
      unit: 'gigabyte',
    });
  });

  it('should leave an unusable size unknown', () => {
    expect(readHermesMailboxFileSize(null)).toEqual({ kind: 'unknown' });
    expect(readHermesMailboxFileSize(-5)).toEqual({ kind: 'unknown' });
    expect(readHermesMailboxFileSize(Number.NaN)).toEqual({ kind: 'unknown' });
  });
});
