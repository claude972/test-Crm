import { registerEnumType } from '@nestjs/graphql';

import { UpgradeHealthEnum } from 'kovaa-lab-shared/types';

export { UpgradeHealthEnum };

registerEnumType(UpgradeHealthEnum, {
  name: 'UpgradeHealth',
});
