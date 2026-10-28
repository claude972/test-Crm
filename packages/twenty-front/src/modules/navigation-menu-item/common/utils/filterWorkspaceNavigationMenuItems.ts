import { type NavigationMenuItem } from '~/generated-metadata/graphql';

import { isDefined } from 'kovaa-lab-shared/utils';

export const filterWorkspaceNavigationMenuItems = (
  items: NavigationMenuItem[],
): NavigationMenuItem[] =>
  items.filter((item) => !isDefined(item.userWorkspaceId));
