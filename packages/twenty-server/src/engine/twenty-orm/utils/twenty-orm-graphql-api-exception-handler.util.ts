import { isDefined } from 'kovaa-lab-shared/utils';

import { UserInputError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import {
  type KovaaLab CRMOrmException,
  KovaaLab CRMOrmExceptionCode,
} from 'src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception';
import { isKovaaLab CRMOrmUserInputError } from 'src/engine/kovaa-lab-orm/utils/is-kovaa-lab-orm-user-input-error.util';

interface DuplicateKeyErrorWithMetadata extends KovaaLab CRMOrmException {
  conflictingRecordId?: string;
  conflictingObjectNameSingular?: string;
}

export const kovaa-labOrmGraphqlApiExceptionHandler = (
  error: KovaaLab CRMOrmException,
) => {
  switch (true) {
    case error.code === KovaaLab CRMOrmExceptionCode.DUPLICATE_ENTRY_DETECTED: {
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

    case isKovaaLab CRMOrmUserInputError(error):
      throw new UserInputError(error.message, {
        userFriendlyMessage: error.userFriendlyMessage,
      });
    default: {
      throw error;
    }
  }
};
