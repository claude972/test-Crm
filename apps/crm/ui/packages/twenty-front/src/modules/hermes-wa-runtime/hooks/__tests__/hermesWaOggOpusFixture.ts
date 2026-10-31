// A real Ogg/Opus byte stream, built here rather than labelled.
//
// WHAT THIS IS. Two correctly framed Ogg pages carrying the two headers the
// Opus-in-Ogg mapping requires: an OpusHead identification header and an
// OpusTags comment header, each with a valid Ogg page checksum.
//
// WHAT THIS IS NOT. It is not a recording and nothing here came from a
// microphone. It carries no audio packets, so it decodes to no sound. No
// provider and no recorder is involved anywhere in these tests.
//
// Why it is worth building at all: the previous fixture was zero bytes with a
// MIME label on them, which could not tell a test that handles a type string
// from a test that handles Opus. These bytes are at least what they say they
// are, so a claim about the container holds.

// Ogg's page checksum: CRC-32 with polynomial 0x04c11db7, zero initial value,
// no input or output reflection and no final XOR. Not the common zlib CRC-32,
// which is why it is written out instead of borrowed.
const OGG_CRC_POLYNOMIAL = 0x04c11db7;

const buildOggCrcTable = (): Uint32Array => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let remainder = index << 24;

    for (let bit = 0; bit < 8; bit += 1) {
      remainder =
        (remainder & 0x80000000) !== 0
          ? ((remainder << 1) ^ OGG_CRC_POLYNOMIAL) >>> 0
          : (remainder << 1) >>> 0;
    }

    table[index] = remainder >>> 0;
  }

  return table;
};

const OGG_CRC_TABLE = buildOggCrcTable();

const oggCrc32 = (bytes: Uint8Array): number => {
  let crc = 0;

  for (const byte of bytes) {
    crc = ((crc << 8) ^ OGG_CRC_TABLE[((crc >>> 24) ^ byte) & 0xff]) >>> 0;
  }

  return crc >>> 0;
};

const writeUint32LE = (
  target: Uint8Array<ArrayBuffer>,
  offset: number,
  value: number,
) => {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
};

const ASCII = (text: string): number[] =>
  Array.from(text, (character) => character.charCodeAt(0));

// One Ogg page. The payload must be under 255 bytes here, which both headers
// are, so a single lacing value describes it.
const buildOggPage = ({
  payload,
  headerType,
  granulePosition,
  serialNumber,
  pageSequence,
}: {
  payload: Uint8Array<ArrayBuffer>;
  headerType: number;
  granulePosition: number;
  serialNumber: number;
  pageSequence: number;
}): Uint8Array<ArrayBuffer> => {
  // Allocated over a real ArrayBuffer on purpose. `Uint8Array<ArrayBufferLike>`
  // may be backed by a SharedArrayBuffer, which `BlobPart` does not accept, and
  // these bytes are handed to a Blob.
  const page = new Uint8Array(new ArrayBuffer(27 + 1 + payload.length));

  page.set(ASCII('OggS'), 0);
  page[4] = 0; // stream structure version
  page[5] = headerType;

  // Granule position, 8 bytes little-endian. Both headers use 0.
  writeUint32LE(page, 6, granulePosition);
  writeUint32LE(page, 10, 0);

  writeUint32LE(page, 14, serialNumber);
  writeUint32LE(page, 18, pageSequence);

  // Bytes 22..25 are the checksum and stay zero while it is computed.
  writeUint32LE(page, 22, 0);

  page[26] = 1; // one segment
  page[27] = payload.length; // its lacing value
  page.set(payload, 28);

  writeUint32LE(page, 22, oggCrc32(page));

  return page;
};

// The OpusHead identification header, 19 bytes, as the Opus-in-Ogg mapping
// defines it: magic, version 1, one channel, a 312-sample pre-skip, the
// original 48 kHz rate, no output gain and channel mapping family 0.
const buildOpusHead = (): Uint8Array<ArrayBuffer> => {
  const header = new Uint8Array(new ArrayBuffer(19));

  header.set(ASCII('OpusHead'), 0);
  header[8] = 1; // version
  header[9] = 1; // channel count
  header[10] = 312 & 0xff; // pre-skip, little-endian
  header[11] = (312 >>> 8) & 0xff;
  writeUint32LE(header, 12, 48000); // input sample rate
  header[16] = 0; // output gain, little-endian
  header[17] = 0;
  header[18] = 0; // channel mapping family

  return header;
};

// The OpusTags comment header: magic, a vendor string, then an empty user
// comment list.
const buildOpusTags = (): Uint8Array<ArrayBuffer> => {
  const vendor = ASCII('hermes-wa-test-fixture');
  const header = new Uint8Array(
    new ArrayBuffer(8 + 4 + vendor.length + 4),
  );

  header.set(ASCII('OpusTags'), 0);
  writeUint32LE(header, 8, vendor.length);
  header.set(vendor, 12);
  writeUint32LE(header, 12 + vendor.length, 0); // no user comments

  return header;
};

export const HERMES_WA_OGG_OPUS_SERIAL_NUMBER = 0x4f707573;

// The two header pages, concatenated. `BOS` is set on the first page, as the
// Ogg framing requires for the start of a logical bitstream.
export const buildHermesWaOggOpusBytes = (): Uint8Array<ArrayBuffer> => {
  const identification = buildOggPage({
    payload: buildOpusHead(),
    headerType: 0x02, // beginning of stream
    granulePosition: 0,
    serialNumber: HERMES_WA_OGG_OPUS_SERIAL_NUMBER,
    pageSequence: 0,
  });

  const comment = buildOggPage({
    payload: buildOpusTags(),
    headerType: 0x00,
    granulePosition: 0,
    serialNumber: HERMES_WA_OGG_OPUS_SERIAL_NUMBER,
    pageSequence: 1,
  });

  const stream = new Uint8Array(
    new ArrayBuffer(identification.length + comment.length),
  );

  stream.set(identification, 0);
  stream.set(comment, identification.length);

  return stream;
};

// The same bytes as a Blob with the type a recorder reports for Opus in Ogg:
// the essence plus a codec parameter, which is the string the contract refuses
// and which therefore has to be reduced before prepare.
export const buildHermesWaOggOpusBlob = (
  type = 'audio/ogg; codecs=opus',
): Blob => new Blob([buildHermesWaOggOpusBytes()], { type });
