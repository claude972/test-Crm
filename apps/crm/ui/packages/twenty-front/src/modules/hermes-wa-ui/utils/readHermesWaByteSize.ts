const BYTES_IN_KIBIBYTE = 1024;
const BYTES_IN_MEBIBYTE = 1024 * 1024;

// A size as a number plus a named unit. The unit is named, not written: the
// label belongs to the component, which has Lingui.
export type HermesWaByteSizeRead =
  | { kind: 'absent' }
  | { kind: 'size'; unit: 'byte' | 'kilobyte' | 'megabyte'; amount: number };

// `absent` rather than zero for anything that is not a size: "0 KB" next to a
// name reads as a broken upload. A real zero-byte file is kept, because an
// empty attachment is a fact the composer has to be able to refuse.
export const readHermesWaByteSize = (
  byteSize: number | null | undefined,
): HermesWaByteSizeRead => {
  if (
    typeof byteSize !== 'number' ||
    !Number.isFinite(byteSize) ||
    byteSize < 0
  ) {
    return { kind: 'absent' };
  }

  if (byteSize < BYTES_IN_KIBIBYTE) {
    return { kind: 'size', unit: 'byte', amount: Math.round(byteSize) };
  }

  if (byteSize < BYTES_IN_MEBIBYTE) {
    return {
      kind: 'size',
      unit: 'kilobyte',
      amount: Math.round(byteSize / BYTES_IN_KIBIBYTE),
    };
  }

  // One decimal from a megabyte up: 16.0 and 16.4 are a different answer to
  // "why was this refused" when the limit is 16 MB.
  return {
    kind: 'size',
    unit: 'megabyte',
    amount: Math.round((byteSize / BYTES_IN_MEBIBYTE) * 10) / 10,
  };
};
