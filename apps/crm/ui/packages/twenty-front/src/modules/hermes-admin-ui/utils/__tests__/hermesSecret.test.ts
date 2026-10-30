import {
  buildHermesSecretSubmission,
  describeHermesSecretSubmission,
  HERMES_SECRET_MASK,
  hermesSecretPlaceholder,
  readHermesSecretField,
} from '@/hermes-admin-ui/utils/hermesSecret';

describe('readHermesSecretField', () => {
  it('tells a stored secret, an absent one and an unknown one apart', () => {
    expect(readHermesSecretField(true)).toEqual({ kind: 'stored' });
    expect(readHermesSecretField(false)).toEqual({ kind: 'absent' });
    expect(readHermesSecretField(null)).toEqual({ kind: 'unknown' });
    expect(readHermesSecretField(undefined)).toEqual({ kind: 'unknown' });
  });

  it('does not present an unknown secret as an absent one', () => {
    expect(readHermesSecretField(null)).not.toEqual({ kind: 'absent' });
  });
});

describe('hermesSecretPlaceholder', () => {
  it('shows a fixed mask when something is stored', () => {
    expect(hermesSecretPlaceholder({ kind: 'stored' })).toBe(
      HERMES_SECRET_MASK,
    );
  });

  it('uses a mask whose length says nothing about any secret', () => {
    // The mask is a constant. Two connections holding secrets of very
    // different lengths are shown the same thing.
    expect(hermesSecretPlaceholder({ kind: 'stored' })).toBe(
      hermesSecretPlaceholder({ kind: 'stored' }),
    );
    expect(HERMES_SECRET_MASK).toMatch(/^•+$/);
  });

  it('shows nothing when no secret is stored, or when nobody said', () => {
    expect(hermesSecretPlaceholder({ kind: 'absent' })).toBe('');
    expect(hermesSecretPlaceholder({ kind: 'unknown' })).toBe('');
  });
});

describe('buildHermesSecretSubmission', () => {
  it('sends nothing about the secret when the field was left untouched', () => {
    expect(buildHermesSecretSubmission('')).toEqual({ kind: 'unchanged' });
  });

  it('carries no value at all in an unchanged submission', () => {
    const submission = buildHermesSecretSubmission('');

    expect(Object.keys(submission)).toEqual(['kind']);
    expect(JSON.stringify(submission)).not.toContain('value');
  });

  it('sends the typed value exactly, without trimming or rewriting it', () => {
    expect(buildHermesSecretSubmission('  s3cr3t  ')).toEqual({
      kind: 'replaced',
      value: '  s3cr3t  ',
    });
  });

  it('treats whitespace as a real replacement rather than as untouched', () => {
    // A space is a legitimate character in a key. Trimming it to '' would
    // silently keep the old secret while the operator believed they changed it.
    expect(buildHermesSecretSubmission(' ')).toEqual({
      kind: 'replaced',
      value: ' ',
    });
  });

  it('never produces a mask as a value', () => {
    expect(buildHermesSecretSubmission('')).not.toEqual({
      kind: 'replaced',
      value: HERMES_SECRET_MASK,
    });
  });
});

describe('describeHermesSecretSubmission', () => {
  it('describes a submission by its decision, never by its contents', () => {
    const description = describeHermesSecretSubmission(
      buildHermesSecretSubmission('s3cr3t'),
    );

    expect(description).toBe('replaced');
    expect(description).not.toContain('s3cr3t');
  });

  it('describes an untouched field as unchanged', () => {
    expect(
      describeHermesSecretSubmission(buildHermesSecretSubmission('')),
    ).toBe('unchanged');
  });
});
