import { EntityMetadataNotFoundError } from 'typeorm/error/EntityMetadataNotFoundError';

import {
  KovaaLab CRMOrmException,
  KovaaLab CRMOrmExceptionCode,
} from 'src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception';

// A workspace object can be absent when upgrading from a version that predates it.
// The v1 GlobalWorkspaceDataSource throws EntityMetadataNotFoundError, while the v2
// datasource throws KovaaLab CRMOrmException(UNKNOWN_OBJECT). Backfill commands must treat
// both as "object not provisioned yet" and skip rather than fail the upgrade.
export const isWorkspaceObjectNotFoundError = (error: unknown): boolean =>
  error instanceof EntityMetadataNotFoundError ||
  (error instanceof KovaaLab CRMOrmException &&
    error.code === KovaaLab CRMOrmExceptionCode.UNKNOWN_OBJECT);
