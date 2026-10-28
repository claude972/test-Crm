export enum KovaaLabCRMOrmExceptionCode {
  QUERY_READ_TIMEOUT = 'QUERY_READ_TIMEOUT',
  TRANSIENT_DATABASE_ERROR = 'TRANSIENT_DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  UNIQUE_CONSTRAINT = 'UNIQUE_CONSTRAINT',
}

export class KovaaLabCRMOrmException extends Error {
  code: KovaaLabCRMOrmExceptionCode;
  constructor(code: KovaaLabCRMOrmExceptionCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}

export type KovaaLabCRMOrmException = Error & {
  code: KovaaLabCRMOrmExceptionCode;
};
