import { deflateSync } from 'node:zlib';

// Genuinely decodable media, built here rather than committed.
//
// Every fixture below is assembled byte by byte to the real container spec, so
// the native magic-byte sniff recognizes it for what it is instead of being
// handed a string that merely claims to be an image. They are built in code on
// purpose: no binary enters the repository, each one is a few hundred bytes at
// most, and anyone reading this file can see exactly what the bytes are.
//
// These are fixtures for a demonstration, not content from a provider. Nothing
// here was received from WhatsApp and nothing here proves a connector.

// CRC-32 (reflected, polynomial 0xedb88320) — the one PNG chunks use.
const crcTable = (() => {
  const table = new Int32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1)
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;

    table[index] = value;
  }

  return table;
})();

const crc32 = (bytes: Buffer): number => {
  let value = 0xffffffff;

  for (const byte of bytes)
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);

  return (value ^ 0xffffffff) >>> 0;
};

const pngChunk = (type: string, data: Buffer): Buffer => {
  const length = Buffer.alloc(4);

  length.writeUInt32BE(data.length);

  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);

  crc.writeUInt32BE(crc32(typed));

  return Buffer.concat([length, typed, crc]);
};

// A real 1x1 truecolour PNG: signature, IHDR, a zlib-deflated IDAT holding one
// filtered scanline, and IEND. It decodes to a single opaque pixel.
export const decodablePng = (
  red = 0x2f,
  green = 0x6f,
  blue = 0xed,
): Buffer => {
  const header = Buffer.alloc(13);

  header.writeUInt32BE(1, 0); // width
  header.writeUInt32BE(1, 4); // height
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // One scanline: filter byte 0, then the pixel.
  const scanline = Buffer.from([0, red, green, blue]);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanline)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

// The deflated pixel data of the PNG above, so a test can inflate it and show
// the image data really decodes rather than only that the header looks right.
export const readPngPixelData = (png: Buffer): Buffer => {
  let offset = 8;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');

    if (type === 'IDAT')
      return png.subarray(offset + 8, offset + 8 + length);

    offset += 12 + length;
  }

  throw new Error('No IDAT chunk in the fixture');
};

const mp4Box = (type: string, payload: Buffer): Buffer => {
  const size = Buffer.alloc(4);

  size.writeUInt32BE(payload.length + 8);

  return Buffer.concat([size, Buffer.from(type, 'ascii'), payload]);
};

// A structurally valid MP4: an ftyp box declaring the isom brand, then a moov
// with a version-0 mvhd. Enough that the container parses and the sniff reads
// it as MP4 video.
//
// Honest about its limits: it carries no encoded frame, so it is a valid
// container rather than a playable picture. That is deliberate — a real encoded
// video would be far larger than a fixture should be.
export const decodableMp4 = (): Buffer => {
  const ftyp = mp4Box(
    'ftyp',
    Buffer.concat([
      Buffer.from('isom', 'ascii'),
      Buffer.from([0x00, 0x00, 0x02, 0x00]),
      Buffer.from('isom', 'ascii'),
      Buffer.from('iso2', 'ascii'),
      Buffer.from('mp41', 'ascii'),
    ]),
  );
  const mvhd = Buffer.alloc(100);

  mvhd.writeUInt32BE(0, 0); // version 0, no flags
  mvhd.writeUInt32BE(0, 4); // creation time
  mvhd.writeUInt32BE(0, 8); // modification time
  mvhd.writeUInt32BE(1000, 12); // timescale
  mvhd.writeUInt32BE(0, 16); // duration
  mvhd.writeUInt32BE(0x00010000, 20); // rate 1.0
  mvhd.writeUInt16BE(0x0100, 24); // volume 1.0
  // Unity transformation matrix.
  mvhd.writeUInt32BE(0x00010000, 36);
  mvhd.writeUInt32BE(0x00010000, 52);
  mvhd.writeUInt32BE(0x40000000, 68);
  mvhd.writeUInt32BE(2, 96); // next track id

  return Buffer.concat([ftyp, mp4Box('moov', mp4Box('mvhd', mvhd))]);
};

// Ogg's CRC-32: polynomial 0x04c11db7, not reflected, zero initial value.
const oggCrcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index << 24;

    for (let bit = 0; bit < 8; bit += 1)
      value = value & 0x80000000 ? (value << 1) ^ 0x04c11db7 : value << 1;

    table[index] = value >>> 0;
  }

  return table;
})();

const oggCrc = (page: Buffer): number => {
  let value = 0;

  for (const byte of page)
    value = ((value << 8) >>> 0) ^ oggCrcTable[((value >>> 24) ^ byte) & 0xff];

  return value >>> 0;
};

// A real Ogg page carrying an OpusHead identification header, with its page
// checksum computed properly, so the page is valid and not merely prefixed with
// the right magic.
//
// Same honesty as the MP4: this is the stream's identification page, so it is a
// valid Opus stream header rather than an audible recording.
export const decodableOggOpus = (): Buffer => {
  const opusHead = Buffer.concat([
    Buffer.from('OpusHead', 'ascii'),
    Buffer.from([1]), // version
    Buffer.from([1]), // mono
    Buffer.from([0x38, 0x01]), // pre-skip, little endian
    Buffer.from([0x80, 0xbb, 0x00, 0x00]), // 48000 Hz, little endian
    Buffer.from([0x00, 0x00]), // output gain
    Buffer.from([0]), // channel mapping family
  ]);
  const page = Buffer.concat([
    Buffer.from('OggS', 'ascii'),
    Buffer.from([0]), // stream structure version
    Buffer.from([0x02]), // beginning of stream
    Buffer.alloc(8), // granule position
    Buffer.from([0x4b, 0x6f, 0x76, 0x61]), // stream serial
    Buffer.alloc(4), // page sequence
    Buffer.alloc(4), // checksum, filled in below
    Buffer.from([1]), // one segment
    Buffer.from([opusHead.length]),
    opusHead,
  ]);

  page.writeUInt32LE(oggCrc(page), 22);

  return page;
};

const ebmlSized = (id: number[], payload: Buffer): Buffer =>
  Buffer.concat([
    Buffer.from(id),
    // One-byte EBML length marker; every fixture here is far below 127 bytes.
    Buffer.from([0x80 | payload.length]),
    payload,
  ]);

// A WebM container header declaring the webm doctype.
//
// This one exists for a specific clause of the contract: a browser recorder
// produces audio in a WebM container, and the native sniff reports the
// container (video/webm) even when the content is audio only. The contract says
// finalize keeps that authoritative MIME with kind AUDIO and never relabels the
// bytes, and this fixture is what lets a test show it.
export const decodableWebmContainer = (): Buffer =>
  Buffer.concat([
    ebmlSized(
      [0x1a, 0x45, 0xdf, 0xa3],
      Buffer.concat([
        ebmlSized([0x42, 0x86], Buffer.from([1])), // EBMLVersion
        ebmlSized([0x42, 0xf7], Buffer.from([1])), // EBMLReadVersion
        ebmlSized([0x42, 0x82], Buffer.from('webm', 'ascii')), // DocType
        ebmlSized([0x42, 0x87], Buffer.from([2])), // DocTypeVersion
        ebmlSized([0x42, 0x85], Buffer.from([2])), // DocTypeReadVersion
      ]),
    ),
    ebmlSized([0x18, 0x53, 0x80, 0x67], Buffer.alloc(0)), // empty Segment
  ]);

// Not media at all: markup that a careless pipeline might accept because the
// caller said it was a picture. Used only to show the guardian refuses it.
export const undecodableMarkup = (): Buffer =>
  Buffer.from('<html><script>alert(1)</script></html>', 'utf8');
