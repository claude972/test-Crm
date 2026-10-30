import { isNonEmptyString } from '@sniptt/guards';

import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';

// The name to show for where an item came from: the server's own label when it
// sent one, its identifier otherwise, and null when it attributed the item to
// nothing at all.
//
// Null is never replaced by the name of the section the item is being shown
// under. An item that arrived unattributed is displayed as unattributed:
// adopting the section's source would turn a gap in the payload into a claim
// about where the data came from.
export const readClientContextSourceName = (
  provenance: ClientContextProvenance,
): string | null =>
  isNonEmptyString(provenance.sourceLabel)
    ? provenance.sourceLabel
    : isNonEmptyString(provenance.sourceId)
      ? provenance.sourceId
      : null;
