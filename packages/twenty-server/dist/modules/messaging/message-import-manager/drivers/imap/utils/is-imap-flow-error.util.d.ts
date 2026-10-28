import { type ImapFlowError } from 'src/modules/messaging/message-import-manager/drivers/imap/types/imap-error.type';
export declare const isImapFlowError: (error: Error) => error is ImapFlowError;
