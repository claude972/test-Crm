import {
  type HermesWaMediaKindRead,
  readHermesWaMediaKind,
} from '@/hermes-wa-ui/types/HermesWaMediaKind';

// Which renderer a local file's MIME type asks for. Only the three families a
// browser previews on its own are recognised; everything else — including an
// absent type — becomes FILE, which gets a name-and-size row rather than a
// guessed player.
export const readHermesWaMimeKind = (
  mimeType: string | null | undefined,
): HermesWaMediaKindRead => {
  const normalised = mimeType?.trim().toLowerCase();

  if (normalised === undefined || normalised.length === 0) {
    return readHermesWaMediaKind('FILE');
  }

  if (normalised.startsWith('image/')) {
    return readHermesWaMediaKind('IMAGE');
  }

  if (normalised.startsWith('video/')) {
    return readHermesWaMediaKind('VIDEO');
  }

  if (normalised.startsWith('audio/')) {
    return readHermesWaMediaKind('VOICE');
  }

  return readHermesWaMediaKind('FILE');
};

// One accept entry: an exact type, a family wildcard, or a bare star. A blank
// MIME type matches nothing — an unknown type is not an accepted one.
const matchesAcceptEntry = (mimeType: string, entry: string): boolean => {
  const type = mimeType.trim().toLowerCase();
  const accepted = entry.trim().toLowerCase();

  if (type.length === 0 || accepted.length === 0) {
    return false;
  }

  if (accepted === '*' || accepted === '*/*') {
    return true;
  }

  if (accepted.endsWith('/*')) {
    return type.startsWith(accepted.slice(0, -1));
  }

  return type === accepted;
};

export const isHermesWaMimeTypeAccepted = (
  mimeType: string | null | undefined,
  acceptedMimeTypes: readonly string[],
): boolean => {
  const normalised = mimeType?.trim().toLowerCase();

  if (normalised === undefined || normalised.length === 0) {
    return false;
  }

  return acceptedMimeTypes.some((entry) =>
    matchesAcceptEntry(normalised, entry),
  );
};
