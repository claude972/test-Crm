import {
  KovaaLab CRMOrmException,
  KovaaLab CRMOrmExceptionCode,
} from 'src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception';

export const isDuplicateEntryError = (error: unknown): boolean =>
  error instanceof KovaaLab CRMOrmException &&
  error.code === KovaaLab CRMOrmExceptionCode.DUPLICATE_ENTRY_DETECTED;
