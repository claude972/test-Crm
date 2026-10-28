import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'kovaa-lab-shared/utils';

import { STANDARD_ERROR_MESSAGE } from 'src/engine/api/common/common-query-runners/errors/standard-error-message.constant';
import {
  INVALID_INPUT_USER_FRIENDLY_MESSAGE,
  TRANSIENT_DATABASE_ERROR_USER_FRIENDLY_MESSAGE,
} from 'src/engine/api/graphql/workspace-query-runner/constants/postgres-error-messages.constants';
import { CustomException } from 'src/utils/custom-exception';

export enum KovaaLab CRMOrmExceptionCode {
  WORKSPACE_SCHEMA_NOT_FOUND = 'WORKSPACE_SCHEMA_NOT_FOUND',
  ROLES_PERMISSIONS_VERSION_NOT_FOUND = 'ROLES_PERMISSIONS_VERSION_NOT_FOUND',
  FEATURE_FLAG_MAP_VERSION_NOT_FOUND = 'FEATURE_FLAG_MAP_VERSION_NOT_FOUND',
  USER_WORKSPACE_ROLE_MAP_VERSION_NOT_FOUND = 'USER_WORKSPACE_ROLE_MAP_VERSION_NOT_FOUND',
  API_KEY_ROLE_MAP_VERSION_NOT_FOUND = 'API_KEY_ROLE_MAP_VERSION_NOT_FOUND',
  MALFORMED_METADATA = 'MALFORMED_METADATA',
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  CONNECT_RECORD_NOT_FOUND = 'CONNECT_RECORD_NOT_FOUND',
  CONNECT_NOT_ALLOWED = 'CONNECT_NOT_ALLOWED',
  CONNECT_UNIQUE_CONSTRAINT_ERROR = 'CONNECT_UNIQUE_CONSTRAINT_ERROR',
  MISSING_MAIN_ALIAS_TARGET = 'MISSING_MAIN_ALIAS_TARGET',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  ENUM_TYPE_NAME_NOT_FOUND = 'ENUM_TYPE_NAME_NOT_FOUND',
  QUERY_READ_TIMEOUT = 'QUERY_READ_TIMEOUT',
  TRANSIENT_DATABASE_ERROR = 'TRANSIENT_DATABASE_ERROR',
  DUPLICATE_ENTRY_DETECTED = 'DUPLICATE_ENTRY_DETECTED',
  TOO_MANY_RECORDS_TO_UPDATE = 'TOO_MANY_RECORDS_TO_UPDATE',
  INVALID_INPUT = 'INVALID_INPUT',
  ORM_EVENT_DATA_CORRUPTED = 'ORM_EVENT_DATA_CORRUPTED',
  RLS_VALIDATION_FAILED = 'RLS_VALIDATION_FAILED',
  NO_ROLE_FOUND_FOR_USER_WORKSPACE = 'NO_ROLE_FOUND_FOR_USER_WORKSPACE',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MALFORMED_SQL = 'MALFORMED_SQL',
  UNKNOWN_OBJECT = 'UNKNOWN_OBJECT',
  UNKNOWN_COLUMN = 'UNKNOWN_COLUMN',
  UNKNOWN_RELATION = 'UNKNOWN_RELATION',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  MISSING_ALIAS = 'MISSING_ALIAS',
  INVALID_QUERY = 'INVALID_QUERY',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
}

const getKovaaLab CRMOrmExceptionUserFriendlyMessage = (
  code: KovaaLab CRMOrmExceptionCode,
) => {
  switch (code) {
    case KovaaLab CRMOrmExceptionCode.WORKSPACE_SCHEMA_NOT_FOUND:
      return msg`Workspace schema not found.`;
    case KovaaLab CRMOrmExceptionCode.ROLES_PERMISSIONS_VERSION_NOT_FOUND:
      return msg`Roles and permissions configuration not found.`;
    case KovaaLab CRMOrmExceptionCode.FEATURE_FLAG_MAP_VERSION_NOT_FOUND:
      return msg`Feature configuration not found.`;
    case KovaaLab CRMOrmExceptionCode.USER_WORKSPACE_ROLE_MAP_VERSION_NOT_FOUND:
      return msg`User workspace role configuration not found.`;
    case KovaaLab CRMOrmExceptionCode.API_KEY_ROLE_MAP_VERSION_NOT_FOUND:
      return msg`API key role configuration not found.`;
    case KovaaLab CRMOrmExceptionCode.MALFORMED_METADATA:
      return msg`Data structure is invalid.`;
    case KovaaLab CRMOrmExceptionCode.WORKSPACE_NOT_FOUND:
      return msg`Workspace not found.`;
    case KovaaLab CRMOrmExceptionCode.CONNECT_RECORD_NOT_FOUND:
      return msg`Related record not found.`;
    case KovaaLab CRMOrmExceptionCode.CONNECT_NOT_ALLOWED:
      return msg`This connection is not allowed.`;
    case KovaaLab CRMOrmExceptionCode.CONNECT_UNIQUE_CONSTRAINT_ERROR:
      return msg`A record with this relationship already exists.`;
    case KovaaLab CRMOrmExceptionCode.MISSING_MAIN_ALIAS_TARGET:
      return msg`Missing main alias target.`;
    case KovaaLab CRMOrmExceptionCode.METHOD_NOT_ALLOWED:
      return msg`This operation is not allowed.`;
    case KovaaLab CRMOrmExceptionCode.QUERY_READ_TIMEOUT:
      return msg`Query timed out. Please try again.`;
    case KovaaLab CRMOrmExceptionCode.TRANSIENT_DATABASE_ERROR:
      return TRANSIENT_DATABASE_ERROR_USER_FRIENDLY_MESSAGE;
    case KovaaLab CRMOrmExceptionCode.DUPLICATE_ENTRY_DETECTED:
      return msg`A duplicate entry was detected.`;
    case KovaaLab CRMOrmExceptionCode.TOO_MANY_RECORDS_TO_UPDATE:
      return msg`Too many records to update at once.`;
    case KovaaLab CRMOrmExceptionCode.INVALID_INPUT:
      return INVALID_INPUT_USER_FRIENDLY_MESSAGE;
    case KovaaLab CRMOrmExceptionCode.RLS_VALIDATION_FAILED:
      return msg`Record does not satisfy security constraints.`;
    case KovaaLab CRMOrmExceptionCode.NO_ROLE_FOUND_FOR_USER_WORKSPACE:
      return msg`No role found for user.`;
    case KovaaLab CRMOrmExceptionCode.ENUM_TYPE_NAME_NOT_FOUND:
    case KovaaLab CRMOrmExceptionCode.ORM_EVENT_DATA_CORRUPTED:
    case KovaaLab CRMOrmExceptionCode.MISSING_PARAMETER:
    case KovaaLab CRMOrmExceptionCode.INVALID_PARAMETER:
    case KovaaLab CRMOrmExceptionCode.MALFORMED_SQL:
    case KovaaLab CRMOrmExceptionCode.UNKNOWN_OBJECT:
    case KovaaLab CRMOrmExceptionCode.UNKNOWN_COLUMN:
    case KovaaLab CRMOrmExceptionCode.UNKNOWN_RELATION:
    case KovaaLab CRMOrmExceptionCode.UNSUPPORTED_OPERATION:
    case KovaaLab CRMOrmExceptionCode.MISSING_ALIAS:
    case KovaaLab CRMOrmExceptionCode.INVALID_QUERY:
    case KovaaLab CRMOrmExceptionCode.ENTITY_NOT_FOUND:
      return STANDARD_ERROR_MESSAGE;
    default:
      assertUnreachable(code);
  }
};

export class KovaaLab CRMOrmException extends CustomException<KovaaLab CRMOrmExceptionCode> {
  constructor(
    message: string,
    code: KovaaLab CRMOrmExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? getKovaaLab CRMOrmExceptionUserFriendlyMessage(code),
    });
  }
}
