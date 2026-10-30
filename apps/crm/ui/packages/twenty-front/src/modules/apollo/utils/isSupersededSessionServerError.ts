import { ServerError } from '@apollo/client/errors';
import { type ErrorLike } from '@apollo/client';

// The REST routes answer a superseded session with 401 and the subCode in the
// body. Without this, that 401 reads as "signed out" and the person is thrown
// out of the app instead of being asked to reload.
export const isSupersededSessionServerError = (error: ErrorLike): boolean => {
  if (!ServerError.is(error) || error.statusCode !== 401) {
    return false;
  }

  const body = (error as { bodyText?: unknown; result?: unknown }).bodyText;
  const payload =
    typeof body === 'string'
      ? body
      : JSON.stringify((error as { result?: unknown }).result ?? '');

  return payload.includes('SESSION_SUPERSEDED');
};
