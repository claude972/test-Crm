import {
  KovaaLabCRMOrmException,
  KovaaLabCRMOrmExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';

export const isDuplicateEntryError = (error: unknown): boolean =>
  error instanceof KovaaLabCRMOrmException &&
  error.code === KovaaLabCRMOrmExceptionCode.DUPLICATE_ENTRY_DETECTED;
