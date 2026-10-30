import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useCallback, useMemo } from 'react';

import {
  type HermesMailboxFolder,
  type HermesMailboxFolderRole,
} from '@/hermes-mailbox-ui/types/HermesMailboxFolder';

// The five folder names, defined once.
//
// Both the folder panel and the thread list heading need them, and two copies
// of the same five strings is two sets of translations that can drift apart —
// so the labels live here and the panels ask for them.
export const useHermesMailboxFolderLabels = () => {
  const { t } = useLingui();

  const roleLabels = useMemo<Record<HermesMailboxFolderRole, string>>(
    () => ({
      inbox: t`Inbox`,
      sent: t`Sent`,
      drafts: t`Drafts`,
      archive: t`Archive`,
      trash: t`Trash`,
    }),
    [t],
  );

  const unnamedLabel = t`Unnamed folder`;

  // A provider folder outside the five roles keeps the name the provider gave
  // it, rather than being pushed into the nearest role.
  const describeFolder = useCallback(
    (folder: HermesMailboxFolder): string => {
      if (folder.role !== null) {
        return roleLabels[folder.role];
      }

      return isNonEmptyString(folder.label) ? folder.label : unnamedLabel;
    },
    [roleLabels, unnamedLabel],
  );

  return { roleLabels, describeFolder };
};
