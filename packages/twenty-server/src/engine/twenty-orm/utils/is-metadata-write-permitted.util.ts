import { MetadataWritability } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

export const isMetadataWritePermitted = ({
  writability,
  isSystemContext,
  isOwningApplication,
}: {
  writability: MetadataWritability | undefined;
  isSystemContext: boolean;
  isOwningApplication: boolean;
}): boolean =>
  !isDefined(writability) ||
  writability === MetadataWritability.OPEN ||
  isSystemContext ||
  (writability === MetadataWritability.APPLICATION && isOwningApplication);
