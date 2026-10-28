import { type ImapFlow } from 'imapflow';
export type MailboxState = {
    uidValidity: number;
    uidNext: number;
    maxUid: number;
    highestModSeq?: bigint;
};
export declare const resolveMailboxState: (client: ImapFlow, folderPath: string, mailbox: NonNullable<ImapFlow["mailbox"]>) => Promise<MailboxState>;
