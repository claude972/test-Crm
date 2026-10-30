import { useLingui } from '@lingui/react/macro';

import { type HermesWaMediaKindRead } from '@/hermes-wa-ui/types/HermesWaMediaKind';

// The human name of a media kind. Null when there is nothing to name, so
// callers say what they know rather than printing "Attachment", which would
// claim more than the data does. An unknown kind shows the server's own word
// verbatim and is never folded into one of the four known names.
export const useHermesWaMediaKindLabel = (
  kind: HermesWaMediaKindRead | null | undefined,
): string | null => {
  const { t } = useLingui();

  if (kind === null || kind === undefined) {
    return null;
  }

  if (kind.kind === 'unknown') {
    return kind.raw;
  }

  switch (kind.mediaKind) {
    case 'IMAGE':
      return t`Image`;
    case 'VIDEO':
      return t`Video`;
    case 'VOICE':
      return t`Voice message`;
    case 'FILE':
      return t`File`;
  }
};
