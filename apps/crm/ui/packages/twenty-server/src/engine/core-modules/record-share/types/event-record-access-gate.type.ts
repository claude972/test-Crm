/* @license Enterprise */

import { type RowAccessPolicySubject } from 'src/engine/kovaa-lab-orm/types/row-access-policy.type';

export type EventRecordAccessGate = {
  resolveAdmittedRecordIds: (
    subject: RowAccessPolicySubject,
  ) => Promise<Set<string>>;
};
