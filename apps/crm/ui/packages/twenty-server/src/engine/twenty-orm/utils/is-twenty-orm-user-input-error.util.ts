import {
  type KovaaLabCRMOrmException,
  KovaaLabCRMOrmExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';

// Codes that describe a problem with the caller's input rather than a server
// fault; the API layers surface them as user input errors (400) instead of 500
export const isKovaaLabCRMOrmUserInputError = (
  error: KovaaLabCRMOrmException,
): boolean => {
  switch (error.code) {
    case KovaaLabCRMOrmExceptionCode.INVALID_INPUT:
    case KovaaLabCRMOrmExceptionCode.INVALID_PARAMETER:
    case KovaaLabCRMOrmExceptionCode.UNKNOWN_OBJECT:
    case KovaaLabCRMOrmExceptionCode.UNKNOWN_COLUMN:
    case KovaaLabCRMOrmExceptionCode.UNKNOWN_RELATION:
    case KovaaLabCRMOrmExceptionCode.UNSUPPORTED_OPERATION:
    case KovaaLabCRMOrmExceptionCode.TOO_MANY_RECORDS_TO_UPDATE:
    case KovaaLabCRMOrmExceptionCode.ENTITY_NOT_FOUND:
    case KovaaLabCRMOrmExceptionCode.DUPLICATE_ENTRY_DETECTED:
    case KovaaLabCRMOrmExceptionCode.CONNECT_RECORD_NOT_FOUND:
    case KovaaLabCRMOrmExceptionCode.CONNECT_NOT_ALLOWED:
    case KovaaLabCRMOrmExceptionCode.CONNECT_UNIQUE_CONSTRAINT_ERROR:
    case KovaaLabCRMOrmExceptionCode.RLS_VALIDATION_FAILED:
      return true;
    default:
      return false;
  }
};
