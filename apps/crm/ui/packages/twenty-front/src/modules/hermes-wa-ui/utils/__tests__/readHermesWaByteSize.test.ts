import { readHermesWaByteSize } from '@/hermes-wa-ui/utils/readHermesWaByteSize';

describe('readHermesWaByteSize', () => {
  it('does not turn an absent size into zero bytes', () => {
    expect(readHermesWaByteSize(null)).toEqual({ kind: 'absent' });
    expect(readHermesWaByteSize(undefined)).toEqual({ kind: 'absent' });
    expect(readHermesWaByteSize(Number.NaN)).toEqual({ kind: 'absent' });
    expect(readHermesWaByteSize(-10)).toEqual({ kind: 'absent' });
  });

  it('keeps a real zero-byte file as a size, so it can be refused', () => {
    expect(readHermesWaByteSize(0)).toEqual({
      kind: 'size',
      unit: 'byte',
      amount: 0,
    });
  });

  it('reports bytes below one kibibyte', () => {
    expect(readHermesWaByteSize(900)).toEqual({
      kind: 'size',
      unit: 'byte',
      amount: 900,
    });
  });

  it('reports whole kilobytes between one kibibyte and one mebibyte', () => {
    expect(readHermesWaByteSize(2048)).toEqual({
      kind: 'size',
      unit: 'kilobyte',
      amount: 2,
    });
    expect(readHermesWaByteSize(1024 * 1023)).toEqual({
      kind: 'size',
      unit: 'kilobyte',
      amount: 1023,
    });
  });

  it('keeps one decimal in megabytes, so 16.4 is not shown as a 16 under a 16 limit', () => {
    expect(readHermesWaByteSize(16 * 1024 * 1024)).toEqual({
      kind: 'size',
      unit: 'megabyte',
      amount: 16,
    });
    expect(readHermesWaByteSize(Math.round(16.44 * 1024 * 1024))).toEqual({
      kind: 'size',
      unit: 'megabyte',
      amount: 16.4,
    });
  });

  it('names the unit instead of writing it, so the label stays translatable', () => {
    const read = readHermesWaByteSize(5 * 1024 * 1024);

    expect(read.kind === 'size' && read.unit).toBe('megabyte');
    expect(JSON.stringify(read)).not.toContain('MB');
  });
});
