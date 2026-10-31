import { EmailingDomainSenderService } from 'src/modules/emailing/services/emailing-domain-sender.service';
import { EmailingDomainDriverExceptionCode } from 'src/engine/core-modules/emailing-domain/drivers/exceptions/emailing-domain-driver.exception';
import { MessageSuppressionReason } from 'src/engine/core-modules/emailing-domain/types/message-suppression-reason.type';

jest.mock(
  'src/engine/core-modules/emailing-domain/drivers/emailing-domain-driver.factory',
  () => ({ EmailingDomainDriverFactory: class {} }),
);
jest.mock(
  'src/engine/core-modules/emailing-domain/emailing-domain.entity',
  () => ({ EmailingDomainEntity: class {} }),
);
jest.mock(
  'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository',
  () => ({ WorkspaceScopedRepository: class {} }),
);
jest.mock('src/modules/emailing/services/message-suppression.service', () => ({
  MessageSuppressionService: class {},
}));
jest.mock(
  'src/engine/metadata-modules/message-channel/entities/message-channel.entity',
  () => ({ MessageChannelEntity: class {} }),
);

const setup = (blocked: string[] = []) => {
  const findApplicableSuppressions = jest
    .fn()
    .mockResolvedValue(
      blocked.map((emailAddress) => ({
        emailAddress,
        reason: MessageSuppressionReason.COMPLAINT,
      })),
    );
  const driver = {
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'ack' }),
    sendEmailBatch: jest
      .fn()
      .mockResolvedValue({
        entries: [
          {
            recipientIndex: 0,
            errorMessage: 'Acknowledgement lost',
            errorCode:
              EmailingDomainDriverExceptionCode.SEND_OUTCOME_UNCONFIRMED,
          },
        ],
      }),
  };
  const service = new EmailingDomainSenderService(
    {
      findOne: jest
        .fn()
        .mockResolvedValue({
          domain: 'example.com',
          status: 'VERIFIED',
          tenantStatus: 'ACTIVE',
        }),
    } as never,
    { getDriverForDomain: () => driver } as never,
    { findApplicableSuppressions } as never,
    { findOne: jest.fn().mockResolvedValue(null) } as never,
  );
  return { service, driver, findApplicableSuppressions };
};
const email = {
  sendKind: 'MARKETING' as const,
  from: 'sender@example.com',
  to: ['Demo <DEMO@example.com>'],
  subject: 'Fixture',
  text: 'Fixture',
};

describe('native sender envelope suppression and uncertain outcomes', () => {
  it('checks a display-name recipient against its bare suppression address', async () => {
    const { service, driver, findApplicableSuppressions } = setup([
      'demo@example.com',
    ]);
    await expect(
      service.sendEmail('workspace', 'domain', email),
    ).rejects.toMatchObject({
      code: EmailingDomainDriverExceptionCode.ALL_RECIPIENTS_SUPPRESSED,
    });
    expect(findApplicableSuppressions).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddresses: ['demo@example.com'] }),
    );
    expect(driver.sendEmail).not.toHaveBeenCalled();
  });
  it('preserves the display name for an unsuppressed provider request', async () => {
    const { service, driver } = setup();
    await service.sendEmail('workspace', 'domain', email);
    expect(driver.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: email.to }),
    );
  });
  it('preserves the uncertain code and original recipient index after suppression', async () => {
    const { service, driver, findApplicableSuppressions } = setup([
      'blocked@example.com',
    ]);
    const result = await service.sendEmailBatch({
      workspaceId: 'workspace',
      emailingDomainId: 'domain',
      sendKind: 'MARKETING',
      from: email.from,
      template: { subject: 'Fixture', text: 'Fixture' },
      recipients: [
        { email: 'Blocked <BLOCKED@example.com>', replacements: {} },
        { email: email.to[0], replacements: {} },
      ],
    });
    expect(findApplicableSuppressions).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddresses: ['blocked@example.com', 'demo@example.com'],
      }),
    );
    expect(driver.sendEmailBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: [{ email: email.to[0], replacements: {} }],
      }),
    );
    expect(result).toMatchObject({
      suppressedRecipientIndexes: [0],
      entries: [
        {
          recipientIndex: 1,
          errorCode: EmailingDomainDriverExceptionCode.SEND_OUTCOME_UNCONFIRMED,
        },
      ],
    });
  });
});
