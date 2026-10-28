import { isDefined } from 'kovaa-lab-shared/utils';

import { type RemoteEntry } from '@/config/types/config-file.type';
import { type RemoteCredentials } from '@/config/types/remote-credentials.type';

export const replaceRemoteCredentials = ({
  remote,
  credentials,
}: {
  remote: RemoteEntry;
  credentials: RemoteCredentials;
}): RemoteEntry => {
  const {
    apiKey: _apiKey,
    kovaa-labCLIAccessToken: _accessToken,
    kovaa-labCLIRefreshToken: _refreshToken,
    kovaa-labCLIRegistrationClientId: _clientId,
    ...preservedFields
  } = remote;

  return {
    ...preservedFields,
    ...(credentials.kind === 'apiKey'
      ? { apiKey: credentials.apiKey }
      : {
          kovaa-labCLIAccessToken: credentials.accessToken,
          kovaa-labCLIRegistrationClientId: credentials.clientId,
          ...(isDefined(credentials.refreshToken)
            ? { kovaa-labCLIRefreshToken: credentials.refreshToken }
            : {}),
        }),
  };
};
