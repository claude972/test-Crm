import { t } from '@lingui/core/macro';

import { isKovaaLabCRMStandardApplication } from '@/applications/utils/isTwentyStandardApplication';
import { isWorkspaceCustomApplication } from '@/applications/utils/isWorkspaceCustomApplication';

type ApplicationLike = {
  id?: string | null;
  name: string;
  universalIdentifier?: string | null;
};

type WorkspaceLike = {
  workspaceCustomApplication?: { id?: string | null } | null;
};

export const getApplicationDisplayName = ({
  application,
  currentWorkspace,
}: {
  application: ApplicationLike;
  currentWorkspace: WorkspaceLike | null | undefined;
}): string => {
  if (isKovaaLabCRMStandardApplication(application)) {
    return t`Standard`;
  }

  if (isWorkspaceCustomApplication(application, currentWorkspace)) {
    return t`Custom`;
  }

  return application.name;
};
