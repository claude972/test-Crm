import { type EmailAttachment } from 'kovaa-lab-shared/types';
import { type EmailDocument } from 'kovaa-lab-shared/utils';

export type ComposeEmailParams = {
  recipients: {
    to: string;
    cc?: string;
    bcc?: string;
  };
  subject: string;
  body: string | EmailDocument;
  connectedAccountId?: string;
  fromHandle?: string;
  files?: Array<EmailAttachment>;
  inReplyTo?: string;
};
