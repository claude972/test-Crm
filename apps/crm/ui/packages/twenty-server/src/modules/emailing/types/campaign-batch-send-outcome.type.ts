import { type EmailingDomainDriverExceptionCode } from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';

export type CampaignBatchSendOutcome = {
  entries: {
    recipientIndex: number;
    messageId: string | null;
    headerMessageId: string | null;
    errorMessage: string | null;
    errorCode?: EmailingDomainDriverExceptionCode | null;
  }[];
  suppressedRecipientIndexes: number[];
};
