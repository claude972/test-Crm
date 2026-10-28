import { MessageParticipantRole, MessageStatus } from 'kovaa-lab-shared/types';
import { MessageDirection } from 'src/modules/messaging/common/enums/message-direction.enum';

export type Message = {
  externalId?: string;
  labelIds?: string[];
  subject: string;
  body: string;
  text?: string;
  status?: MessageStatus;
  receivedAt?: Date;
  direction?: MessageDirection;
  isDraft?: boolean;
  messageHeaders?: Array<{ name: string; value: string }>;
};

export type MessageParticipant = {
  role: MessageParticipantRole;
  handle: string;
  displayName?: string | null;
};

export type MessageWithParticipants = Message & {
  participants?: MessageParticipant[];
  headerMessageId?: string;
  messageThreadExternalId?: string;
  messageFolderExternalIds?: string[];
  attachments?: any[];
};
