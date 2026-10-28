import {
  CoreObjectNameSingular,
  NavigationMenuItemType,
} from 'kovaa-lab-shared/types';

export const isCoreWorkflowsObjectNavigationMenuItem = ({
  navigationMenuItemType,
  objectNameSingular,
}: {
  navigationMenuItemType?: NavigationMenuItemType;
  objectNameSingular?: string | null;
}) =>
  navigationMenuItemType === NavigationMenuItemType.OBJECT &&
  objectNameSingular === CoreObjectNameSingular.Workflow;
