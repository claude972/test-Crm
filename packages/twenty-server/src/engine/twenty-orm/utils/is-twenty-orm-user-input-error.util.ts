import {
  type KovaaLab CRMOrmException,
  KovaaLab CRMOrmExceptionCode,
} from 'src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception';

// Codes that describe a problem with the caller's input rather than a server
// fault; the API layers surface them as user input errors (400) instead of 500
export const isKovaaLab CRMOrmUserInputError = (
  error: KovaaLab CRMOrmException,
): boolean => {
  switch (error.code) {
    case KovaaLab CRMOrmExceptionCode.INVALID_INPUT:
    case KovaaLab CRMOrmExceptionCode.INVALID_PARAMETER:
    case KovaaLab CRMOrmExceptionCode.UNKNOWN_OBJECT:
    case KovaaLab CRMOrmExceptionCode.UNKNOWN_COLUMN:
    case KovaaLab CRMOrmExceptionCode.UNKNOWN_RELATION:
    case KovaaLab CRMOrmExceptionCode.UNSUPPORTED_OPERATION:
    case KovaaLab CRMOrmExceptionCode.TOO_MANY_RECORDS_TO_UPDATE:
    case KovaaLab CRMOrmExceptionCode.ENTITY_NOT_FOUND:
    case KovaaLab CRMOrmExceptionCode.DUPLICATE_ENTRY_DETECTED:
    case KovaaLab CRMOrmExceptionCode.CONNECT_RECORD_NOT_FOUND:
    case KovaaLab CRMOrmExceptionCode.CONNECT_NOT_ALLOWED:
    case KovaaLab CRMOrmExceptionCode.CONNECT_UNIQUE_CONSTRAINT_ERROR:
    case KovaaLab CRMOrmExceptionCode.RLS_VALIDATION_FAILED:
      return true;
    default:
      return false;
  }
};
