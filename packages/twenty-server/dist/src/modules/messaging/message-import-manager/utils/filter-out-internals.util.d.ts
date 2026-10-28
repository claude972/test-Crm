import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
export declare const filterOutInternals: (primaryHandle: string, messages: MessageWithParticipants[]) => MessageWithParticipants[];
