import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';

describe('readHermesCallFailure', () => {
  it('reports no failure for an absent error', () => {
    expect(readHermesCallFailure(null)).toEqual({
      kind: 'none',
      message: null,
    });
    expect(readHermesCallFailure(undefined).kind).toBe('none');
  });

  it('reads a refusal as an authorisation answer', () => {
    expect(readHermesCallFailure({ code: 'FORBIDDEN' }).kind).toBe('denied');
  });

  // The defect this replaces: the retention bound answers 409 too, and calling
  // it "same batch id" sent someone to change an id that was never involved.
  it('separates the retention bound from a batch id conflict', () => {
    expect(
      readHermesCallFailure({ code: 'IMPORT_BATCH_LIMIT_REACHED' }).kind,
    ).toBe('retention-limit');
  });

  it('does not read the retention bound as a plain conflict', () => {
    expect(
      readHermesCallFailure({ code: 'IMPORT_BATCH_LIMIT_REACHED' }).kind,
    ).not.toBe('conflict');
  });

  it('keeps an unattributed conflict as a conflict', () => {
    expect(readHermesCallFailure({ code: 'CONFLICT' }).kind).toBe('conflict');
  });

  it('reads a rejected input as such', () => {
    expect(readHermesCallFailure({ code: 'BAD_USER_INPUT' }).kind).toBe(
      'rejected-input',
    );
  });

  it('keeps the server wording for the folded diagnostic, never as the kind', () => {
    const failure = readHermesCallFailure({
      code: 'CONFLICT',
      message: '  fingerprint mismatch  ',
    });

    expect(failure.message).toBe('fingerprint mismatch');
  });

  it('carries no message when the error has none worth showing', () => {
    expect(readHermesCallFailure({ code: 'CONFLICT', message: '   ' }).message).toBe(
      null,
    );
  });

  it('falls back to a plain failure rather than guessing a cause', () => {
    expect(readHermesCallFailure(new Error('socket hang up')).kind).toBe(
      'failed',
    );
  });
});
