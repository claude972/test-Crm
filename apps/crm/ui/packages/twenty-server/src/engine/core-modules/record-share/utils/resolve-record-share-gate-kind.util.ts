/* @license Enterprise */

import { MetadataReadability } from 'kovaa-lab-shared/types';
import { assertUnreachable } from 'kovaa-lab-shared/utils';

export type RecordShareGateKind = 'open' | 'deny' | 'private' | 'inherited';

export const resolveRecordShareGateKind = ({
  readability,
  isOwningApplication,
}: {
  readability: MetadataReadability;
  isOwningApplication: boolean;
}): RecordShareGateKind => {
  switch (readability) {
    case MetadataReadability.OPEN:
      return 'open';
    case MetadataReadability.SYSTEM:
      return 'deny';
    case MetadataReadability.APPLICATION:
      return isOwningApplication ? 'open' : 'deny';
    case MetadataReadability.PRIVATE:
      return isOwningApplication ? 'open' : 'private';
    case MetadataReadability.INHERITED:
      return isOwningApplication ? 'open' : 'inherited';
    default:
      assertUnreachable(readability);
  }
};
