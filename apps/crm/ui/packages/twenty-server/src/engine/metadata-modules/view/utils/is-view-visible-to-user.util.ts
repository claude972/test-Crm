import { ViewVisibility } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

export const isViewVisibleToUser = (
  view: {
    visibility: ViewVisibility;
    createdByUserWorkspaceId?: string | null;
  },
  userWorkspaceId?: string,
): boolean => {
  if (view.visibility === ViewVisibility.WORKSPACE) {
    return true;
  }

  return (
    view.visibility === ViewVisibility.UNLISTED &&
    isDefined(userWorkspaceId) &&
    view.createdByUserWorkspaceId === userWorkspaceId
  );
};
