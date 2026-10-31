import { MessageChannelType } from 'kovaa-lab-shared/types';

import { type EmailingDomainMailboxTransportProvider } from 'src/engine/core-modules/emailing-domain/drivers/smtp/providers/emailing-domain-mailbox-transport.provider';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { MessageChannelExceptionCode } from 'src/engine/metadata-modules/message-channel/message-channel.exception';
import { type MessageChannelMetadataService } from 'src/engine/metadata-modules/message-channel/message-channel-metadata.service';
import { CampaignMessageChannelService } from 'src/modules/emailing/services/campaign-message-channel.service';

const input = {
  fromAddress: 'operator@campaign.test',
  workspaceId: 'workspace-a',
  userWorkspaceId: 'operator-a',
};
const nativeChannel = { id: 'native-channel', type: MessageChannelType.EMAIL };

const setup = (
  driver = EmailingDomainDriver.SMTP,
  isConnectionCentreInstalled = true,
) => {
  const authorize = jest.fn().mockResolvedValue({
    connectedAccountId: 'registered-account-a',
    address: input.fromAddress,
    cacheKey: 'workspace-a|mail-connection|1',
  });
  const findByConnectedAccountIdForUser = jest
    .fn()
    .mockResolvedValue([nativeChannel]);
  const getOrCreateEmailGroupChannel = jest.fn().mockResolvedValue({
    id: 'group-channel',
    type: MessageChannelType.EMAIL_GROUP,
  });
  const service = new CampaignMessageChannelService(
    { get: () => driver } as unknown as KovaaLabCRMConfigService,
    {
      isConnectionCentreInstalled,
      authorize,
    } as unknown as EmailingDomainMailboxTransportProvider,
    {
      findByConnectedAccountIdForUser,
      getOrCreateEmailGroupChannel,
    } as unknown as MessageChannelMetadataService,
  );

  return {
    service,
    authorize,
    findByConnectedAccountIdForUser,
    getOrCreateEmailGroupChannel,
  };
};

describe('CampaignMessageChannelService', () => {
  it('uses the exact registered SMTP mailbox without requiring an inbound forwarder', async () => {
    const context = setup();

    await expect(context.service.resolve(input)).resolves.toBe(nativeChannel);
    expect(context.authorize).toHaveBeenCalledWith(
      input.workspaceId,
      input.fromAddress,
    );
    expect(context.findByConnectedAccountIdForUser).toHaveBeenCalledWith({
      workspaceId: input.workspaceId,
      userWorkspaceId: input.userWorkspaceId,
      connectedAccountId: 'registered-account-a',
    });
    expect(context.getOrCreateEmailGroupChannel).not.toHaveBeenCalled();
  });

  it('does not bypass the native account visibility policy', async () => {
    const context = setup();
    const refusal = new Error('account is not usable by this caller');

    context.findByConnectedAccountIdForUser.mockRejectedValue(refusal);

    await expect(context.service.resolve(input)).rejects.toBe(refusal);
    expect(context.getOrCreateEmailGroupChannel).not.toHaveBeenCalled();
  });

  it('never falls back when the central mailbox is revoked or rotated', async () => {
    const context = setup();
    const refusal = new Error('mail connection is unavailable');

    context.authorize.mockRejectedValue(refusal);

    await expect(context.service.resolve(input)).rejects.toBe(refusal);
    expect(context.findByConnectedAccountIdForUser).not.toHaveBeenCalled();
    expect(context.getOrCreateEmailGroupChannel).not.toHaveBeenCalled();
  });

  it.each([
    { channels: [] },
    { channels: [{ id: 'group-only', type: MessageChannelType.EMAIL_GROUP }] },
  ])(
    'refuses an SMTP mailbox without its native email channel: %j',
    async ({ channels }) => {
      const context = setup();

      context.findByConnectedAccountIdForUser.mockResolvedValue(channels);

      await expect(context.service.resolve(input)).rejects.toMatchObject({
        code: MessageChannelExceptionCode.MESSAGE_CHANNEL_NOT_FOUND,
      });
      expect(context.getOrCreateEmailGroupChannel).not.toHaveBeenCalled();
    },
  );

  it.each([
    EmailingDomainDriver.LOG,
    EmailingDomainDriver.AWS_SES,
    EmailingDomainDriver.RESEND,
  ])('keeps the email-group channel path for %s', async (driver) => {
    const context = setup(driver);

    await expect(context.service.resolve(input)).resolves.toMatchObject({
      id: 'group-channel',
    });
    expect(context.getOrCreateEmailGroupChannel).toHaveBeenCalledWith(input);
    expect(context.authorize).not.toHaveBeenCalled();
  });

  it('keeps the legacy path when the connection centre is not installed', async () => {
    const context = setup(EmailingDomainDriver.SMTP, false);

    await context.service.resolve(input);

    expect(context.getOrCreateEmailGroupChannel).toHaveBeenCalledWith(input);
    expect(context.authorize).not.toHaveBeenCalled();
  });
});
