export enum CalendarChannelSyncStage {
  CALENDAR_EVENTS_IMPORT_PENDING = 'calendar-events-import-pending',
  CALENDAR_EVENTS_IMPORT_SCHEDULED = 'calendar-events-import-scheduled',
  CALENDAR_EVENTS_IMPORT_ONGOING = 'calendar-events-import-ongoing',
  CALENDAR_EVENT_LIST_FETCH_PENDING = 'calendar-event-list-fetch-pending',
  CALENDAR_EVENT_LIST_FETCH_SCHEDULED = 'calendar-event-list-fetch-scheduled',
  CALENDAR_EVENT_LIST_FETCH_ONGOING = 'calendar-event-list-fetch-ongoing',
  FAILED = 'failed'
}
export enum CalendarChannelSyncStatus {
  ACTIVE = 'active',
  NOT_SYNCED = 'not-synced',
  ONGOING = 'ongoing',
  FAILED_INSUFFICIENT_PERMISSIONS = 'failed-insufficient-permissions',
  FAILED_UNKNOWN = 'failed-unknown'
}
export enum MessageChannelType {
  APP = 'app',
  EMAIL_GROUP = 'email-group'
}
export enum MessageChannelSyncStage {
  MESSAGES_IMPORT_PENDING = 'messages-import-pending',
  MESSAGES_IMPORT_SCHEDULED = 'messages-import-scheduled',
  MESSAGES_IMPORT_ONGOING = 'messages-import-ongoing',
  MESSAGE_LIST_FETCH_PENDING = 'message-list-fetch-pending',
  MESSAGE_LIST_FETCH_SCHEDULED = 'message-list-fetch-scheduled',
  MESSAGE_LIST_FETCH_ONGOING = 'message-list-fetch-ongoing',
  FAILED = 'failed'
}
export enum MessageParticipantRole {
  FROM = 'from',
  TO = 'to',
  CC = 'cc',
  BCC = 'bcc',
  REPLY_TO = 'reply-to'
}
export enum FieldActorSource {
  CALENDAR = 'calendar',
  EMAIL = 'email'
}
export enum FeatureFlagKey {
  IS_CALENDAR_EVENT_SHARED_ACROSS_CHANNELS_ENABLED = 'isCalendarEventSharedAcrossChannelsEnabled'
}
export enum MessageFolderImportPolicy {
  ALL_FOLDERS = 'all-folders',
  SELECTED_FOLDERS = 'selected-folders'
}
export enum MessageChannelPendingGroupEmailsAction {
  NONE = 'none',
  GROUP_EMAILS_IMPORT = 'group-emails-import',
  GROUP_EMAILS_DELETION = 'group-emails-deletion'
}
export enum MessageFolderPendingSyncAction {
  NONE = 'none',
  FOLDER_IMPORT = 'folder-import',
  FOLDER_DELETION = 'folder-deletion'
}
export enum ConnectedAccountProvider {
  APP = 'app',
  EMAIL_GROUP = 'email-group',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  IMAP_SMTP_CALDAV = 'imap-smtp-caldav',
  OIDC = 'oidc',
  SAML = 'saml'
}
export type LinksMetadata = { url?: string; title?: string; description?: string };
export type ContactStage = 'new' | 'contacted' | 'qualified' | 'lost';
export type CalendarEventStatus = 'scheduled' | 'cancelled' | 'completed';
export type InboxStatus = 'open' | 'closed' | 'archived';
export type MessageStatus = 'sent' | 'received' | 'draft';
