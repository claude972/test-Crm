import { registerEnumType } from '@nestjs/graphql';

import { EventLogTable } from 'kovaa-lab-shared/types';

export const registerEventLogTableEnum = () => {
  registerEnumType(EventLogTable, {
    name: 'EventLogTable',
  });
};
