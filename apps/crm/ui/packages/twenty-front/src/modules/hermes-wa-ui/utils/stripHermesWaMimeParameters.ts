// A MIME type reduced to type/subtype. MediaRecorder reports what it produced
// — `audio/webm;codecs=opus` is a normal answer — and the contract refuses a
// declared type carrying parameters. Only the parameters go: the type itself
// is never rewritten into one the server is thought to prefer.
export const stripHermesWaMimeParameters = (
  mimeType: string | null | undefined,
): string => {
  if (typeof mimeType !== 'string') {
    return '';
  }

  const [essence] = mimeType.split(';');

  return essence.trim().toLowerCase();
};
