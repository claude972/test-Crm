import { type gmail_v1 as gmailV1 } from 'googleapis';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
export declare const parseAndFormatGmailMessage: (message: gmailV1.Schema$Message, connectedAccount: Pick<ConnectedAccountEntity, "handle" | "handleAliases">) => MessageWithParticipants | null;
