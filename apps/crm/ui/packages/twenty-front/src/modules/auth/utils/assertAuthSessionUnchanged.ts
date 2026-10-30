import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { t } from '@lingui/core/macro';

import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';

export const authSessionSupersededError = () =>
  new CombinedGraphQLErrors({
    errors: [
      {
        message: t`Authentication failed`,
        extensions: { code: 'UNAUTHENTICATED', subCode: 'SESSION_SUPERSEDED' },
      },
    ],
  });

export const assertAuthSessionUnchanged = (generation: string | null): void => {
  if (generation !== getSessionGeneration()) throw authSessionSupersededError();
};
