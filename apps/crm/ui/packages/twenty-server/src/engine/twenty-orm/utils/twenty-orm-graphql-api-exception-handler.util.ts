import { isDefined } from 'kovaa-lab-shared/utils';

import { UserInputError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import {
  type KovaaLabCRMOrmException,
  KovaaLabCRMOrmExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';
import { isKovaaLabCRMOrmUserInputError } from 'src/engine/twenty-orm/utils/is-twenty-orm-user-input-error.util';

interface DuplicateKeyErrorWithMetadata extends KovaaLabCRMOrmException {
  conflictingRecordId?: string;
  conflictingObjectNameSingular?: string;
}

export const kovaaLabOrmGraphqlApiExceptionHandler = (
  error: KovaaLabCRMOrmException,
) => {
  switch (true) {
    case error.code === KovaaLabCRMOrmExceptionCode.DUPLICATE_ENTRY_DETECTED: {
      const duplicateKeyError: DuplicateKeyErrorWithMetadata = error;

      const extensions: Record<string, unknown> = {
        userFriendlyMessage: error.userFriendlyMessage,
        ...(isDefined(duplicateKeyError.conflictingRecordId) &&
        isDefined(duplicateKeyError.conflictingObjectNameSingular)
          ? {
              conflictingRecordId: duplicateKeyError.conflictingRecordId,
              conflictingObjectNameSingular:
                duplicateKeyError.conflictingObjectNameSingular,
            }
          : {}),
      };

      throw new UserInputError(error.message, extensions);
    }

    case isKovaaLabCRMOrmUserInputError(error):
      throw new UserInputError(error.message, {
        userFriendlyMessage: error.userFriendlyMessage,
      });
    default: {
      throw error;
    }
  }
};
