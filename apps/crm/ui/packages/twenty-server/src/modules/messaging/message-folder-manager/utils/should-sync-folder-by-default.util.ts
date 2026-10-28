import { MessageFolderImportPolicy } from 'kovaa-lab-shared/types';

export const shouldSyncFolderByDefault = (
  messageFolderImportPolicy: MessageFolderImportPolicy,
): boolean => {
  return messageFolderImportPolicy === MessageFolderImportPolicy.ALL_FOLDERS;
};
