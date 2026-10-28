import { type EmailAttachment } from 'kovaa-lab-shared/types';
import { type EmailRecipients } from 'kovaa-lab-shared/workflow';

export type WorkflowSendEmailActionInput = {
  connectedAccountId: string;
  fromHandle?: string;
  recipients: EmailRecipients;
  subject?: string;
  body?: string;
  files?: EmailAttachment[];
  inReplyTo?: string;
};
