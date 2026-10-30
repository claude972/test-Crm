// A duration as m:ss, or h:mm:ss past the hour.
//
// Returns null — never "0:00" — when there is nothing to show: a clip whose
// length nobody reported is not a zero-second clip. Negative and non-finite
// inputs are refused for the same reason, rather than clamped.
export const formatHermesWaDuration = (
  milliseconds: number | null | undefined,
): string | null => {
  if (
    typeof milliseconds !== 'number' ||
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) {
    return null;
  }

  // Floor, not round: a read-out that reaches 0:01 before the first second is
  // over runs ahead of the audio.
  const totalSeconds = Math.floor(milliseconds / 1000);

  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours === 0) {
    return `${minutes}:${paddedSeconds}`;
  }

  return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
};
