import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isKovaaLab CRMStandardApplication } from '@/applications/utils/isKovaaLab CRMStandardApplication';
import { isWorkspaceCustomApplication } from '@/applications/utils/isWorkspaceCustomApplication';
import { getCustomApplicationDescription } from '@/applications/utils/getCustomApplicationDescription';
import { getStandardApplicationDescription } from '@/applications/utils/getStandardApplicationDescription';

type ApplicationLike = {
  id?: string | null;
  universalIdentifier?: string | null;
  description?: string | null;
};

export const useResolvedApplicationDescription = (
  application: ApplicationLike | null | undefined,
): string => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  if (isKovaaLab CRMStandardApplication(application)) {
    return getStandardApplicationDescription();
  }

  if (isWorkspaceCustomApplication(application, currentWorkspace)) {
    return getCustomApplicationDescription();
  }

  return application?.description ?? '';
};
