import { EntityMetadataNotFoundError } from 'typeorm/error/EntityMetadataNotFoundError';

import {
  KovaaLabCRMOrmException,
  KovaaLabCRMOrmExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';

// A workspace object can be absent when upgrading from a version that predates it.
// The v1 GlobalWorkspaceDataSource throws EntityMetadataNotFoundError, while the v2
// datasource throws KovaaLabCRMOrmException(UNKNOWN_OBJECT). Backfill commands must treat
// both as "object not provisioned yet" and skip rather than fail the upgrade.
export const isWorkspaceObjectNotFoundError = (error: unknown): boolean =>
  error instanceof EntityMetadataNotFoundError ||
  (error instanceof KovaaLabCRMOrmException &&
    error.code === KovaaLabCRMOrmExceptionCode.UNKNOWN_OBJECT);
