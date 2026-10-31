import {
  buildHermesWaOggOpusBlob,
  buildHermesWaOggOpusBytes,
  HERMES_WA_OGG_OPUS_SERIAL_NUMBER,
} from '@/hermes-wa-runtime/hooks/__tests__/hermesWaOggOpusFixture';

// The fixture claims to be a real Ogg/Opus header stream, so that claim is
// checked here rather than asserted in a comment. These tests say nothing
// about any upload path; they only keep the fixture honest.

const text = (bytes: Uint8Array, from: number, length: number): string =>
  String.fromCharCode(...bytes.slice(from, from + length));

const readUint32LE = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)) >>>
  0;

// A deliberately slow, table-free CRC, written a second way. If the fixture's
// lookup table were built wrong the two would disagree, which is the mistake
// most likely to make "valid Ogg" untrue.
const bitwiseOggCrc32 = (bytes: Uint8Array): number => {
  let crc = 0;

  for (const byte of bytes) {
    crc = (crc ^ (byte << 24)) >>> 0;

    for (let bit = 0; bit < 8; bit += 1) {
      crc =
        (crc & 0x80000000) !== 0
          ? ((crc << 1) ^ 0x04c11db7) >>> 0
          : (crc << 1) >>> 0;
    }
  }

  return crc >>> 0;
};

const withZeroedChecksum = (page: Uint8Array): Uint8Array => {
  const copy = new Uint8Array(page);

  copy[22] = 0;
  copy[23] = 0;
  copy[24] = 0;
  copy[25] = 0;

  return copy;
};

describe('the Ogg/Opus fixture', () => {
  it('frames a beginning-of-stream page carrying OpusHead', () => {
    const bytes = buildHermesWaOggOpusBytes();

    expect(text(bytes, 0, 4)).toBe('OggS');
    // Stream structure version 0 is the only one Ogg defines.
    expect(bytes[4]).toBe(0);
    // 0x02 is BOS, required on the first page of a logical bitstream.
    expect(bytes[5]).toBe(0x02);
    expect(readUint32LE(bytes, 14)).toBe(HERMES_WA_OGG_OPUS_SERIAL_NUMBER);
    expect(readUint32LE(bytes, 18)).toBe(0);

    // One segment, and its lacing value is the 19-byte OpusHead length.
    expect(bytes[26]).toBe(1);
    expect(bytes[27]).toBe(19);
    expect(text(bytes, 28, 8)).toBe('OpusHead');
  });

  it('declares the Opus parameters the mapping requires', () => {
    const bytes = buildHermesWaOggOpusBytes();
    const head = 28;

    expect(bytes[head + 8]).toBe(1); // version 1
    expect(bytes[head + 9]).toBe(1); // one channel
    expect(bytes[head + 10] | (bytes[head + 11] << 8)).toBe(312); // pre-skip
    expect(readUint32LE(bytes, head + 12)).toBe(48000); // original rate
    expect(bytes[head + 18]).toBe(0); // mapping family 0
  });

  it('follows it with a second page carrying OpusTags', () => {
    const bytes = buildHermesWaOggOpusBytes();
    const second = 28 + 19;

    expect(text(bytes, second, 4)).toBe('OggS');
    // Not BOS: only the first page may carry it.
    expect(bytes[second + 5]).toBe(0x00);
    expect(readUint32LE(bytes, second + 18)).toBe(1); // page sequence 1
    expect(text(bytes, second + 28, 8)).toBe('OpusTags');
  });

  it('writes a page checksum that recomputes to itself', () => {
    const bytes = buildHermesWaOggOpusBytes();
    const firstPage = bytes.slice(0, 28 + 19);
    const stored = readUint32LE(firstPage, 22);

    expect(stored).not.toBe(0);
    expect(bitwiseOggCrc32(withZeroedChecksum(firstPage))).toBe(stored);
  });

  it('checksums the comment page too', () => {
    const bytes = buildHermesWaOggOpusBytes();
    const secondPage = bytes.slice(28 + 19);
    const stored = readUint32LE(secondPage, 22);

    expect(stored).not.toBe(0);
    expect(bitwiseOggCrc32(withZeroedChecksum(secondPage))).toBe(stored);
  });

  // Ogg's CRC uses a zero initial value, unlike the reflected CRC-32 most
  // libraries expose. Pinned so a future edit cannot quietly swap it.
  it('uses a zero-initialised, unreflected CRC', () => {
    expect(bitwiseOggCrc32(new Uint8Array([]))).toBe(0);
    expect(bitwiseOggCrc32(new Uint8Array([0x00]))).toBe(0);
    // The zlib CRC-32 of a single zero byte is 0xD202EF8D; this is not that.
    expect(bitwiseOggCrc32(new Uint8Array([0x01]))).toBe(0x04c11db7);
  });

  it('is not an empty or zero-filled buffer, which the old fixture was', () => {
    const bytes = buildHermesWaOggOpusBytes();

    expect(bytes.length).toBeGreaterThan(60);
    expect(bytes.some((byte) => byte !== 0)).toBe(true);
  });

  it('presents the recorder MIME with its codec parameter still attached', () => {
    // Blob normalises the type to lower case and keeps the parameter, which is
    // exactly the string the contract refuses and the upload must reduce.
    expect(buildHermesWaOggOpusBlob().type).toBe('audio/ogg; codecs=opus');
    expect(buildHermesWaOggOpusBlob('audio/webm;codecs=opus').type).toBe(
      'audio/webm;codecs=opus',
    );
  });
});
