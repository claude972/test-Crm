import { WebhookSubscriptionChannelType } from 'kovaa-lab-shared/types';

export type WebhookSubscriptionChannelReference = {
  channelType: WebhookSubscriptionChannelType;
  channelId: string;
  workspaceId: string;
};
