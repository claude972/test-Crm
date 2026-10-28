import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
export declare const filterGmailMessagesByFolderPolicy: (messages: MessageWithParticipants[], messageChannel: Pick<MessageChannelEntity, "messageFolders" | "messageFolderImportPolicy">) => MessageWithParticipants[];
