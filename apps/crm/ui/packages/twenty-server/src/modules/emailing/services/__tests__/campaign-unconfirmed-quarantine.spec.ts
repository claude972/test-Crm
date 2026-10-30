import { FindOperator } from 'typeorm';

import {
  EmailingDomainDriverException,
  EmailingDomainDriverExceptionCode,
} from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import { CAMPAIGN_DELIVERY_STATE } from 'src/engine/core-modules/emailing-domain/constants/campaign-delivery-state.constant';
import { CAMPAIGN_FAILURE_REASON } from 'src/engine/core-modules/emailing-domain/constants/campaign-failure-reason.constant';
import { type SendCampaignEmailJobData } from 'src/engine/core-modules/emailing-domain/types/send-campaign-email-job-data.type';
import { type SendCampaignEmailBatchJobData } from 'src/engine/core-modules/emailing-domain/types/send-campaign-email-batch-job-data.type';
import { CampaignDeliveryWorkspaceEntity } from 'src/modules/emailing/standard-objects/campaign-delivery.workspace-entity';
import { MessageCampaignDeliveryService } from 'src/modules/emailing/services/message-campaign-delivery.service';
import { MessageCampaignBatchDeliveryService } from 'src/modules/emailing/services/message-campaign-batch-delivery.service';
import { MessageCampaignLifecycleService } from 'src/modules/emailing/services/message-campaign-lifecycle.service';

jest.mock('uuid', () => ({ v4: () => `claim-${Math.random()}` }));
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock(
  'src/engine/core-modules/message-queue/services/message-queue.service',
  () => ({ MessageQueueService: class {} }),
);
jest.mock(
  'src/engine/core-modules/exception-handler/exception-handler.service',
  () => ({ ExceptionHandlerService: class {} }),
);
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class {},
}));
jest.mock(
  'src/modules/emailing/services/emailing-domain-sender.service',
  () => ({ EmailingDomainSenderService: class {} }),
);
jest.mock('src/modules/emailing/services/email-billing.service', () => ({
  EmailBillingService: class {},
}));
jest.mock('src/modules/emailing/services/campaign-variable.service', () => ({
  CampaignVariableService: class {},
}));
jest.mock('src/modules/emailing/services/campaign-send-slot.service', () => ({
  CampaignSendSlotService: class {},
}));
jest.mock(
  'src/modules/emailing/services/message-campaign-statistics.service',
  () => ({ MessageCampaignStatisticsService: class {} }),
);
jest.mock(
  'src/modules/emailing/services/campaign-tracking-content.service',
  () => ({ CampaignTrackingContentService: class {} }),
);
jest.mock('src/modules/emailing/utils/render-campaign-email.util', () => ({
  renderCampaignEmail: async () => ({
    subject: 'Fixture',
    html: '<p>Fixture</p>',
    plainText: 'Fixture',
  }),
}));
jest.mock(
  'src/modules/emailing/utils/compile-campaign-batch-template.util',
  () => ({
    compileCampaignBatchTemplate: async () => ({
      template: { subject: 'Fixture', html: '<p>Fixture</p>', text: 'Fixture' },
      plainTextSourceHtml: '<p>Fixture</p>',
      campaignVariables: [],
    }),
  }),
);

const matchesValue = (value: unknown, criterion: unknown): boolean => {
  if (!(criterion instanceof FindOperator)) return value === criterion;
  switch (criterion.type) {
    case 'in':
      return (criterion.value as unknown[]).includes(value);
    case 'isNull':
      return value === null || value === undefined;
    case 'not':
      return !matchesValue(value, criterion.child ?? criterion.value);
    case 'or':
      return (criterion.value as unknown[]).some((child) =>
        matchesValue(value, child),
      );
    case 'lessThan':
      return (
        value instanceof Date &&
        value.getTime() < (criterion.value as Date).getTime()
      );
    default:
      throw new Error(`Unsupported fixture criterion ${criterion.type}`);
  }
};

const matches = (
  row: CampaignDeliveryWorkspaceEntity,
  criteria: Record<string, unknown>,
) =>
  Object.entries(criteria).every(([key, value]) =>
    matchesValue(row[key as keyof CampaignDeliveryWorkspaceEntity], value),
  );

const setup = () => {
  const row = Object.assign(new CampaignDeliveryWorkspaceEntity(), {
    id: 'delivery',
    campaignId: 'campaign',
    state: CAMPAIGN_DELIVERY_STATE.QUEUED,
    failureReason: null,
    skipReason: null,
    claimToken: null,
    claimExpiresAt: null,
    providerMessageId: null,
    sentAt: null,
    deliveredAt: null,
    updatedAt: new Date(),
  });
  let failedSettlements = 0;
  let failedRawSettlements = 0;
  const deliveryRepository = {
    existsBy: jest.fn(async (criteria: Record<string, unknown>) =>
      matches(row, criteria),
    ),
    update: jest.fn(
      async (
        criteria: Record<string, unknown>,
        update: Partial<CampaignDeliveryWorkspaceEntity>,
      ) => {
        if (failedSettlements > 0 && update.claimToken === null) {
          failedSettlements--;
          throw new Error('Fixture persistence unavailable');
        }
        if (!matches(row, criteria)) return { generatedMaps: [], affected: 0 };
        Object.assign(row, update, { updatedAt: new Date() });
        return { generatedMaps: [{ ...row }], affected: 1 };
      },
    ),
    executeRaw: jest.fn(
      async (_sql: string, parameters: Record<string, unknown>) => {
        if (failedRawSettlements > 0) {
          failedRawSettlements--;
          throw new Error('Fixture settlement unavailable');
        }
        const ids = parameters.deliveryIds as string[];
        const index = ids.indexOf(row.id);
        if (index < 0 || row.claimToken !== parameters.claimToken) return [];
        Object.assign(row, {
          state: (parameters.states as string[])[index],
          failureReason: (parameters.failureReasons as (string | null)[])[
            index
          ],
          skipReason: (parameters.skipReasons as (string | null)[])[index],
          providerMessageId: (
            parameters.providerMessageIds as (string | null)[]
          )[index],
          sentAt: (parameters.sentAtValues as (Date | null)[])[index],
          claimToken: null,
          claimExpiresAt: null,
        });
        return [{ id: row.id }];
      },
    ),
  };
  const messageUpdate = jest.fn(async () => ({}));
  const campaign = {
    id: 'campaign',
    status: 'SENDING',
    subject: 'Fixture',
    bodyTemplate: 'Fixture',
    fromAddress: { primaryEmail: 'sender@example.com' },
  };
  const manager = {
    executeInWorkspaceContext: async (callback: () => Promise<unknown>) =>
      callback(),
    getRepository: (entity: { name: string }) => {
      if (entity.name === 'CampaignDeliveryWorkspaceEntity')
        return deliveryRepository;
      if (entity.name === 'MessageCampaignWorkspaceEntity')
        return { findOne: async () => campaign };
      if (entity.name === 'PersonWorkspaceEntity')
        return { findOne: async () => null, find: async () => [] };
      return { update: messageUpdate };
    },
  };
  const sender = {
    sendEmail: jest.fn(async () => {
      throw new EmailingDomainDriverException(
        'DATA accepted but acknowledgement lost',
        EmailingDomainDriverExceptionCode.SEND_OUTCOME_UNCONFIRMED,
      );
    }),
    sendEmailBatch: jest.fn(async () => ({
      entries: [
        {
          recipientIndex: 0,
          messageId: null,
          headerMessageId: null,
          errorMessage: 'Acknowledgement lost',
          errorCode: EmailingDomainDriverExceptionCode.SEND_OUTCOME_UNCONFIRMED,
        },
      ],
      suppressedRecipientIndexes: [],
    })),
    findBlockedRecipientAddresses: jest.fn(async () => new Set<string>()),
  };
  const billing = {
    findEmailSendRefusal: jest.fn(async () => null),
    billSentEmails: jest.fn(async () => undefined),
  };
  const variables = { buildVariablesForPerson: async () => ({}) };
  const lifecycle = {
    findRunningCampaign: async () => campaign,
    finalizeCampaignIfComplete: async () => undefined,
  };
  const statistics = { scheduleRefresh: async () => undefined };
  const slots = { findSendSlotRefusal: async () => null };
  const queue = { add: jest.fn(), bulkAdd: jest.fn() };
  const tracking = {
    prepareBatch: async (input: {
      template: object;
      recipients: {
        deliveryId: string;
        replacements: Record<string, string>;
      }[];
    }) => ({
      template: input.template,
      replacementsByDeliveryId: new Map(
        input.recipients.map((recipient) => [
          recipient.deliveryId,
          recipient.replacements,
        ]),
      ),
    }),
  };
  const simple = new MessageCampaignDeliveryService(
    manager as never,
    sender as never,
    billing as never,
    variables as never,
    lifecycle as never,
    statistics as never,
    slots as never,
    queue as never,
  );
  const batch = new MessageCampaignBatchDeliveryService(
    queue as never,
    manager as never,
    sender as never,
    billing as never,
    variables as never,
    tracking as never,
    { captureExceptions: jest.fn() } as never,
    lifecycle as never,
    statistics as never,
    slots as never,
  );
  const nativeLifecycle = new MessageCampaignLifecycleService(
    manager as never,
    {} as never,
    statistics as never,
  );
  const data: SendCampaignEmailJobData = {
    workspaceId: '00000000-0000-4000-8000-000000000001',
    campaignId: 'campaign',
    messageId: row.id,
    personId: 'person',
    recipientEmail: 'recipient@example.com',
    emailingDomainId: 'domain',
    userWorkspaceId: 'membership',
  };
  const batchData: SendCampaignEmailBatchJobData = {
    workspaceId: data.workspaceId,
    campaignId: data.campaignId,
    emailingDomainId: data.emailingDomainId,
    userWorkspaceId: data.userWorkspaceId,
    recipients: [
      {
        messageId: row.id,
        personId: data.personId,
        email: data.recipientEmail,
      },
    ],
  };
  return {
    row,
    simple,
    batch,
    data,
    batchData,
    sender,
    billing,
    queue,
    messageUpdate,
    nativeLifecycle,
    deliveryRepository,
    failSettlements: (count: number) => {
      failedSettlements = count;
    },
    failRawSettlements: (count: number) => {
      failedRawSettlements = count;
    },
  };
};

describe('Native campaigns quarantine uncertain SMTP handoffs', () => {
  it('does not emit a second single message when a post-DATA result is unconfirmed', async () => {
    const { simple, data, sender, row, billing, messageUpdate } = setup();
    await simple.processSendJob(data);
    expect(row).toMatchObject({
      state: 'FAILED',
      failureReason: 'SEND_OUTCOME_UNCONFIRMED',
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
      claimToken: null,
    });
    await simple.processSendJob(data);
    expect(sender.sendEmail).toHaveBeenCalledTimes(1);
    expect(billing.billSentEmails).not.toHaveBeenCalled();
    expect(messageUpdate).not.toHaveBeenCalled();
  });

  it('persists a guard before transport and preserves it through a failed failure write and claim expiry', async () => {
    const { simple, data, sender, row, failSettlements, nativeLifecycle } =
      setup();
    failSettlements(1);
    await expect(simple.processSendJob(data)).rejects.toThrow(
      'Fixture persistence unavailable',
    );
    expect(row).toMatchObject({
      state: 'SENDING',
      failureReason: 'SEND_OUTCOME_UNCONFIRMED',
    });
    row.claimExpiresAt = new Date(Date.now() - 1);
    await nativeLifecycle.failDeliveriesWithExpiredClaims({
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
    });
    expect(row).toMatchObject({
      state: 'FAILED',
      failureReason: 'SEND_OUTCOME_UNCONFIRMED',
    });
    await simple.processSendJob(data);
    expect(sender.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('keeps a known pre-delivery temporary error retryable', async () => {
    const { simple, data, sender, row } = setup();
    sender.sendEmail.mockRejectedValue(
      new EmailingDomainDriverException(
        'Temporary rejection before acceptance',
        EmailingDomainDriverExceptionCode.TEMPORARY_ERROR,
      ),
    );
    await expect(simple.processSendJob(data)).rejects.toBeInstanceOf(
      EmailingDomainDriverException,
    );
    expect(row).toMatchObject({
      state: 'QUEUED',
      failureReason: 'TEMPORARY_ERROR',
    });
    await expect(simple.processSendJob(data)).rejects.toBeInstanceOf(
      EmailingDomainDriverException,
    );
    expect(sender.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('does not emit a second batch recipient after the structured unconfirmed outcome', async () => {
    const { batch, batchData, sender, row, billing, messageUpdate } = setup();
    await batch.processSendBatchJob(batchData);
    expect(row).toMatchObject({
      state: 'FAILED',
      failureReason: 'SEND_OUTCOME_UNCONFIRMED',
      providerMessageId: null,
      sentAt: null,
      deliveredAt: null,
    });
    await batch.processSendBatchJob(batchData);
    expect(sender.sendEmailBatch).toHaveBeenCalledTimes(1);
    expect(billing.billSentEmails).not.toHaveBeenCalled();
    expect(messageUpdate).not.toHaveBeenCalled();
  });

  it('keeps a known temporary batch rejection claimable', async () => {
    const { batch, batchData, sender, row } = setup();
    sender.sendEmailBatch.mockResolvedValue({
      entries: [
        {
          recipientIndex: 0,
          errorMessage: 'Temporary rejection',
          errorCode: EmailingDomainDriverExceptionCode.TEMPORARY_ERROR,
        },
      ],
      suppressedRecipientIndexes: [],
    });
    await batch.processSendBatchJob(batchData);
    expect(row).toMatchObject({
      state: 'FAILED',
      failureReason: 'TEMPORARY_ERROR',
    });
    await batch.processSendBatchJob(batchData);
    expect(sender.sendEmailBatch).toHaveBeenCalledTimes(2);
  });

  it('does not blindly requeue an uncertain batch when both settlement and recovery writes fail', async () => {
    const { batch, batchData, sender, row, failRawSettlements } = setup();
    failRawSettlements(2);
    await expect(batch.processSendBatchJob(batchData)).rejects.toThrow(
      'Fixture settlement unavailable',
    );
    expect(row).toMatchObject({
      state: 'FAILED',
      failureReason: 'SEND_OUTCOME_UNCONFIRMED',
    });
    await batch.processSendBatchJob(batchData);
    expect(sender.sendEmailBatch).toHaveBeenCalledTimes(1);
  });

  it('quarantines a recipient missing from the provider result instead of inventing a failed retry', async () => {
    const { batch, batchData, sender, row } = setup();
    sender.sendEmailBatch.mockResolvedValue({
      entries: [],
      suppressedRecipientIndexes: [],
    });
    await batch.processSendBatchJob(batchData);
    await batch.processSendBatchJob(batchData);
    expect(row.failureReason).toBe('SEND_OUTCOME_UNCONFIRMED');
    expect(sender.sendEmailBatch).toHaveBeenCalledTimes(1);
  });

  it('cannot clear the quarantine by passing an orphaned queued delivery through the stale cron', async () => {
    const { row, nativeLifecycle, simple, data, sender } = setup();
    row.state = CAMPAIGN_DELIVERY_STATE.QUEUED;
    row.failureReason = CAMPAIGN_FAILURE_REASON.SEND_OUTCOME_UNCONFIRMED;
    row.updatedAt = new Date(Date.now() - 60_000);
    await nativeLifecycle.failOrphanedQueuedDeliveries({
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      untouchedSince: new Date(),
    });
    expect(row.failureReason).toBe('SEND_OUTCOME_UNCONFIRMED');
    await simple.processSendJob(data);
    expect(sender.sendEmail).not.toHaveBeenCalled();
  });
});
