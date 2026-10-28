import { type MessageFolderPendingSyncAction } from 'kovaa-lab-shared/types';

export type MessageFolder = {
  id: string;
  name: string;
  isSynced: boolean;
  isSentFolder: boolean;
  parentFolderId: string | null;
  externalId: string | null;
  pendingSyncAction: MessageFolderPendingSyncAction;
  messageChannelId: string;
  createdAt: string;
  updatedAt: string;
  __typename: 'MessageFolder';
};
