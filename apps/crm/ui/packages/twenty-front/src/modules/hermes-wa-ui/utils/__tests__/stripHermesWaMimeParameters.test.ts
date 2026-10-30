import { stripHermesWaMimeParameters } from '@/hermes-wa-ui/utils/stripHermesWaMimeParameters';

describe('stripHermesWaMimeParameters', () => {
  it('removes the codecs parameter MediaRecorder reports', () => {
    expect(stripHermesWaMimeParameters('audio/webm;codecs=opus')).toBe(
      'audio/webm',
    );
    expect(stripHermesWaMimeParameters('video/mp4; codecs="avc1.42E01E"')).toBe(
      'video/mp4',
    );
  });

  it('leaves a type without parameters alone', () => {
    expect(stripHermesWaMimeParameters('audio/ogg')).toBe('audio/ogg');
  });

  it('normalises case and surrounding space', () => {
    expect(stripHermesWaMimeParameters('  AUDIO/WebM ; codecs=opus ')).toBe(
      'audio/webm',
    );
  });

  it('returns an empty string when there is no type, rather than guessing one', () => {
    expect(stripHermesWaMimeParameters(null)).toBe('');
    expect(stripHermesWaMimeParameters(undefined)).toBe('');
    expect(stripHermesWaMimeParameters('')).toBe('');
  });
});
