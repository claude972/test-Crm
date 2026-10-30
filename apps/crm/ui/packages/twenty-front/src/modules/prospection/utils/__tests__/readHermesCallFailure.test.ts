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

  // Both documented causes reach the client as the same answer: the server's
  // exception converter emits extensions.code = CONFLICT with no subCode for
  // the retention bound as well as for a reused batch id. These two cases are
  // the real wire shape, not a simulated named code.
  it('reads a reused batch id as a conflict', () => {
    expect(
      readHermesCallFailure({
        code: 'CONFLICT',
        message: 'Import batch already exists with different content',
      }).kind,
    ).toBe('conflict');
  });

  it('reads a full workspace as the same conflict, because the wire gives no way to tell them apart', () => {
    expect(
      readHermesCallFailure({
        code: 'CONFLICT',
        message: 'IMPORT_BATCH_LIMIT_REACHED',
      }).kind,
    ).toBe('conflict');
  });

  it('does not invent a cause from the server message', () => {
    const quota = readHermesCallFailure({
      code: 'CONFLICT',
      message: 'IMPORT_BATCH_LIMIT_REACHED',
    });
    const reusedId = readHermesCallFailure({
      code: 'CONFLICT',
      message: 'Import batch already exists with different content',
    });

    expect(quota.kind).toBe(reusedId.kind);
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
