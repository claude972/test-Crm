import { registerEnumType } from '@nestjs/graphql';

import { NavigationMenuItemType } from 'kovaa-lab-shared/types';

registerEnumType(NavigationMenuItemType, {
  name: 'NavigationMenuItemType',
});

export { NavigationMenuItemType };
