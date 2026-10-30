import { EmailingDomainDriverExceptionCode } from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import { resolveCampaignBatchSettlements } from 'src/modules/emailing/utils/resolve-campaign-batch-settlements.util';

describe('Campaign batch provider outcome contract', () => {
  it('preserves structured unconfirmed outcomes through batch settlement', () => {
    const [settlement] = resolveCampaignBatchSettlements({
      claimedRecipients: [{ messageId: 'delivery' }],
      outcome: {
        entries: [
          {
            recipientIndex: 0,
            messageId: null,
            headerMessageId: null,
            errorMessage: 'DATA acknowledgement lost',
            errorCode:
              EmailingDomainDriverExceptionCode.SEND_OUTCOME_UNCONFIRMED,
          },
        ],
        suppressedRecipientIndexes: [],
      },
    });
    expect(settlement).toEqual({
      deliveryId: 'delivery',
      state: 'FAILED',
      failureReason: 'SEND_OUTCOME_UNCONFIRMED',
      skipReason: null,
      providerMessageId: null,
      sentAt: null,
    });
  });

  it('does not treat a locally generated id as acceptance when the provider explicitly says unconfirmed', () => {
    const [settlement] = resolveCampaignBatchSettlements({
      claimedRecipients: [{ messageId: 'delivery' }],
      outcome: {
        entries: [
          {
            recipientIndex: 0,
            messageId: 'local-generated-id',
            headerMessageId: 'local-generated-id',
            errorMessage: 'Unconfirmed',
            errorCode:
              EmailingDomainDriverExceptionCode.SEND_OUTCOME_UNCONFIRMED,
          },
        ],
        suppressedRecipientIndexes: [],
      },
    });
    expect(settlement).toMatchObject({
      state: 'FAILED',
      failureReason: 'SEND_OUTCOME_UNCONFIRMED',
      providerMessageId: null,
      sentAt: null,
    });
  });

  it('keeps known temporary failures distinguishable from quarantine', () => {
    const [settlement] = resolveCampaignBatchSettlements({
      claimedRecipients: [{ messageId: 'delivery' }],
      outcome: {
        entries: [
          {
            recipientIndex: 0,
            messageId: null,
            headerMessageId: null,
            errorMessage: 'Temporary provider rejection',
            errorCode: EmailingDomainDriverExceptionCode.TEMPORARY_ERROR,
          },
        ],
        suppressedRecipientIndexes: [],
      },
    });
    expect(settlement).toMatchObject({
      state: 'FAILED',
      failureReason: 'TEMPORARY_ERROR',
      sentAt: null,
    });
  });

  it('quarantines a missing per-recipient result, while preserving acknowledged and suppressed recipients', () => {
    const settlements = resolveCampaignBatchSettlements({
      claimedRecipients: [
        { messageId: 'acknowledged' },
        { messageId: 'suppressed' },
        { messageId: 'unconfirmed' },
      ],
      outcome: {
        entries: [
          {
            recipientIndex: 0,
            messageId: 'provider-id',
            headerMessageId: 'provider-id',
            errorMessage: null,
          },
        ],
        suppressedRecipientIndexes: [1],
      },
    });
    expect(
      settlements.find((entry) => entry.deliveryId === 'acknowledged'),
    ).toMatchObject({ state: 'SENT', providerMessageId: 'provider-id' });
    expect(
      settlements.find((entry) => entry.deliveryId === 'suppressed'),
    ).toMatchObject({
      state: 'SKIPPED',
      skipReason: 'SUPPRESSED',
      sentAt: null,
    });
    expect(
      settlements.find((entry) => entry.deliveryId === 'unconfirmed'),
    ).toMatchObject({
      state: 'FAILED',
      failureReason: 'SEND_OUTCOME_UNCONFIRMED',
      sentAt: null,
    });
    expect(
      settlements.every((entry) => !Object.hasOwn(entry, 'deliveredAt')),
    ).toBe(true);
  });
});
