import { isDefined } from 'kovaa-lab-shared/utils';

import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';

// Background executions carry no request user, so nothing is hidden from them.
export const isConnectionHiddenFromRequestUser = ({
  account,
  requestUserWorkspaceId,
}: {
  account: Pick<ConnectedAccountEntity, 'scope' | 'userWorkspaceId'>;
  requestUserWorkspaceId: string | null;
}): boolean =>
  isDefined(requestUserWorkspaceId) &&
  account.scope === 'USER' &&
  account.userWorkspaceId !== requestUserWorkspaceId;
