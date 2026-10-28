export enum MessageFolderName {
  INBOX = 'inbox',
  SENT_ITEMS = 'sentitems',
  DRAFTS = 'drafts',
  DELETED_ITEMS = 'deleteditems',
  JUNK = 'junk',
  IMPORTANT = 'important',
  ARCHIVE = 'archive',
}

export type MicrosoftFolder = {
  id: string;
  displayName: string;
};
