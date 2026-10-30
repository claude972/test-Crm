import {
  type HermesWaMediaLimits,
  judgeHermesWaMediaSelection,
} from '@/hermes-wa-ui/utils/judgeHermesWaMediaSelection';

const KNOWN_LIMITS: HermesWaMediaLimits = {
  maxByteSize: 16 * 1024 * 1024,
  acceptedMimeTypes: ['image/*', 'application/pdf'],
  maxByteSizeByMimeType: null,
};

const file = (overrides: Partial<{ name: string; byteSize: number; mimeType: string }> = {}) => ({
  name: 'plan.png',
  byteSize: 2 * 1024 * 1024,
  mimeType: 'image/png',
  ...overrides,
});

describe('judgeHermesWaMediaSelection', () => {
  it('accepts a file inside both limits', () => {
    expect(judgeHermesWaMediaSelection(file(), KNOWN_LIMITS)).toEqual({
      kind: 'accepted',
      maxByteSize: 16 * 1024 * 1024,
    });
  });

  it('matches a family wildcard and an exact type', () => {
    expect(
      judgeHermesWaMediaSelection(
        file({ mimeType: 'image/jpeg' }),
        KNOWN_LIMITS,
      ).kind,
    ).toBe('accepted');

    expect(
      judgeHermesWaMediaSelection(
        file({ mimeType: 'application/pdf' }),
        KNOWN_LIMITS,
      ).kind,
    ).toBe('accepted');
  });

  it('refuses a type outside the list', () => {
    expect(
      judgeHermesWaMediaSelection(
        file({ mimeType: 'application/zip' }),
        KNOWN_LIMITS,
      ),
    ).toEqual({
      kind: 'refused',
      reason: 'unacceptedType',
      byteSize: null,
      maxByteSize: null,
    });
  });

  it('does not accept a file whose type the browser did not report', () => {
    expect(
      judgeHermesWaMediaSelection(file({ mimeType: '' }), KNOWN_LIMITS).kind,
    ).toBe('refused');
  });

  it('refuses a file over the limit and keeps both numbers for the sentence', () => {
    const verdict = judgeHermesWaMediaSelection(
      file({ byteSize: 24 * 1024 * 1024 }),
      KNOWN_LIMITS,
    );

    expect(verdict).toEqual({
      kind: 'refused',
      reason: 'tooLarge',
      byteSize: 24 * 1024 * 1024,
      maxByteSize: 16 * 1024 * 1024,
    });
  });

  it('accepts a file exactly on the limit', () => {
    expect(
      judgeHermesWaMediaSelection(
        file({ byteSize: 16 * 1024 * 1024 }),
        KNOWN_LIMITS,
      ).kind,
    ).toBe('accepted');
  });

  it('refuses an empty file before consulting any limit', () => {
    expect(
      judgeHermesWaMediaSelection(file({ byteSize: 0 }), {
        maxByteSize: null,
        acceptedMimeTypes: null,
        maxByteSizeByMimeType: null,
      }),
    ).toEqual({
      kind: 'refused',
      reason: 'empty',
      byteSize: null,
      maxByteSize: null,
    });
  });

  it('treats an unknown size limit as undecidable, never as unlimited', () => {
    expect(
      judgeHermesWaMediaSelection(file({ byteSize: 900 * 1024 * 1024 }), {
        ...KNOWN_LIMITS,
        maxByteSize: null,
      }),
    ).toEqual({ kind: 'undecidable', reason: 'maxByteSizeUnknown' });
  });

  it('treats unknown accepted types as undecidable, never as "anything goes"', () => {
    expect(
      judgeHermesWaMediaSelection(file(), {
        ...KNOWN_LIMITS,
        acceptedMimeTypes: null,
      }),
    ).toEqual({ kind: 'undecidable', reason: 'acceptedTypesUnknown' });
  });

  it('refuses every type when the accepted list is empty, which is not the same as unknown', () => {
    expect(
      judgeHermesWaMediaSelection(file(), {
        ...KNOWN_LIMITS,
        acceptedMimeTypes: [],
      }).kind,
    ).toBe('refused');
  });

  it('lets a per-type ceiling win over the default, as the documented limits need', () => {
    const limits: HermesWaMediaLimits = {
      acceptedMimeTypes: ['image/png', 'video/mp4'],
      maxByteSize: 5 * 1024 * 1024,
      maxByteSizeByMimeType: { 'video/mp4': 16 * 1024 * 1024 },
    };

    expect(
      judgeHermesWaMediaSelection(
        file({ mimeType: 'video/mp4', byteSize: 10 * 1024 * 1024 }),
        limits,
      ),
    ).toEqual({ kind: 'accepted', maxByteSize: 16 * 1024 * 1024 });

    expect(
      judgeHermesWaMediaSelection(
        file({ mimeType: 'image/png', byteSize: 10 * 1024 * 1024 }),
        limits,
      ),
    ).toEqual({
      kind: 'refused',
      reason: 'tooLarge',
      byteSize: 10 * 1024 * 1024,
      maxByteSize: 5 * 1024 * 1024,
    });
  });

  it('compares the type on its essence, so a codecs parameter does not refuse a file', () => {
    expect(
      judgeHermesWaMediaSelection(file({ mimeType: 'image/png;charset=x' }), {
        acceptedMimeTypes: ['image/png'],
        maxByteSize: 16 * 1024 * 1024,
        maxByteSizeByMimeType: null,
      }).kind,
    ).toBe('accepted');
  });
});
