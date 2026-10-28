/* @license Enterprise */

import {
  type RecordShareAccessLevel,
  type RecordSharePrincipalType,
  type RecordShareRowCause,
} from 'kovaa-lab-shared/types';

export type RecordShareInput = {
  recordId: string;
  objectMetadataId: string;
  principalId: string;
  principalType: RecordSharePrincipalType;
  accessLevel: RecordShareAccessLevel;
  rowCause: RecordShareRowCause;
  sourceId: string;
};
