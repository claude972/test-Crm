import {
  isHermesWaMimeTypeAccepted,
  readHermesWaMimeKind,
} from '@/hermes-wa-ui/utils/readHermesWaMimeKind';

describe('readHermesWaMimeKind', () => {
  it('maps the three previewable families', () => {
    expect(readHermesWaMimeKind('image/png')).toEqual({
      kind: 'known',
      mediaKind: 'IMAGE',
    });
    expect(readHermesWaMimeKind('video/mp4')).toEqual({
      kind: 'known',
      mediaKind: 'VIDEO',
    });
    expect(readHermesWaMimeKind('audio/ogg')).toEqual({
      kind: 'known',
      mediaKind: 'VOICE',
    });
  });

  it('falls back to a file row rather than guessing a player', () => {
    expect(readHermesWaMimeKind('application/pdf')).toEqual({
      kind: 'known',
      mediaKind: 'FILE',
    });
    expect(readHermesWaMimeKind(null)).toEqual({
      kind: 'known',
      mediaKind: 'FILE',
    });
    expect(readHermesWaMimeKind('   ')).toEqual({
      kind: 'known',
      mediaKind: 'FILE',
    });
  });

  it('ignores case and surrounding space', () => {
    expect(readHermesWaMimeKind('  IMAGE/PNG ')).toEqual({
      kind: 'known',
      mediaKind: 'IMAGE',
    });
  });
});

describe('isHermesWaMimeTypeAccepted', () => {
  it('matches an exact type', () => {
    expect(isHermesWaMimeTypeAccepted('image/png', ['image/png'])).toBe(true);
    expect(isHermesWaMimeTypeAccepted('image/gif', ['image/png'])).toBe(false);
  });

  it('matches a family wildcard', () => {
    expect(isHermesWaMimeTypeAccepted('image/webp', ['image/*'])).toBe(true);
    expect(isHermesWaMimeTypeAccepted('video/webm', ['image/*'])).toBe(false);
  });

  it('treats a bare star as any type', () => {
    expect(isHermesWaMimeTypeAccepted('application/zip', ['*/*'])).toBe(true);
    expect(isHermesWaMimeTypeAccepted('application/zip', ['*'])).toBe(true);
  });

  it('matches nothing when the type is absent: unknown is not accepted', () => {
    expect(isHermesWaMimeTypeAccepted(null, ['*/*'])).toBe(false);
    expect(isHermesWaMimeTypeAccepted('', ['image/*'])).toBe(false);
    expect(isHermesWaMimeTypeAccepted('  ', ['image/*'])).toBe(false);
  });

  it('matches nothing against an empty list', () => {
    expect(isHermesWaMimeTypeAccepted('image/png', [])).toBe(false);
  });

  it('ignores case on both sides', () => {
    expect(isHermesWaMimeTypeAccepted('IMAGE/PNG', ['image/*'])).toBe(true);
    expect(isHermesWaMimeTypeAccepted('image/png', ['IMAGE/PNG'])).toBe(true);
  });
});
