export enum ConnectedAccountProvider {
  GMAIL = 'gmail',
  MICROSOFT = 'microsoft',
  GENERIC = 'generic',
}

export enum MessageFolderImportPolicy {
  ALL_FOLDERS = 'all-folders',
  SELECTED_FOLDERS = 'selected-folders',
}

export enum MessageFolderPendingSyncAction {
  NONE = 'none',
  FOLDER_IMPORT = 'folder-import',
  FOLDER_DELETION = 'folder-deletion',
}
