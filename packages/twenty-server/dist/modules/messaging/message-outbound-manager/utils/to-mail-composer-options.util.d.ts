import { type SendMessageInput } from 'src/modules/messaging/message-outbound-manager/types/send-message-input.type';
export declare const toMailComposerOptions: (from: string, sendMessageInput: SendMessageInput) => {
    inReplyTo?: any;
    references?: any;
    attachments?: any;
    from: string;
    to: any;
    cc: any;
    bcc: any;
    subject: any;
    text: any;
    html: any;
    newline: string;
};
