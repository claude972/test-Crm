import { isKovaaLab CRMStandardApplication } from '@/applications/utils/isKovaaLab CRMStandardApplication';
import { isWorkspaceCustomApplication } from '@/applications/utils/isWorkspaceCustomApplication';
import { isDefined } from 'kovaa-lab-shared/utils';

type ApplicationLike = {
  id?: string | null;
  universalIdentifier?: string | null;
};

type WorkspaceLike = {
  workspaceCustomApplication?: { id?: string | null } | null;
};

export const isThirdPartyApplication = ({
  application,
  currentWorkspace,
}: {
  application: ApplicationLike | null | undefined;
  currentWorkspace: WorkspaceLike | null | undefined;
}): boolean => {
  return (
    isDefined(application) &&
    !isKovaaLab CRMStandardApplication(application) &&
    !isWorkspaceCustomApplication(application, currentWorkspace)
  );
};
