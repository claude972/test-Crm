import { validate } from 'class-validator';
import { v5 } from 'uuid';

import { CancelMessageCampaignInput } from 'src/engine/core-modules/emailing-domain/dtos/cancel-message-campaign.input';
import { CreateMessageSuppressionInput } from 'src/engine/core-modules/emailing-domain/dtos/create-message-suppression.input';
import { FindMessageSuppressionsInput } from 'src/engine/core-modules/emailing-domain/dtos/find-message-suppressions.input';
import { PreviewMessageCampaignAudienceInput } from 'src/engine/core-modules/emailing-domain/dtos/preview-message-campaign-audience.input';
import { PreviewMessageCampaignRecipientInput } from 'src/engine/core-modules/emailing-domain/dtos/preview-message-campaign-recipient.input';
import { PreviewMessageCampaignSendInput } from 'src/engine/core-modules/emailing-domain/dtos/preview-message-campaign-send.input';
import { SendMessageCampaignTestInput } from 'src/engine/core-modules/emailing-domain/dtos/send-message-campaign-test.input';
import { SendMessageCampaignInput } from 'src/engine/core-modules/emailing-domain/dtos/send-message-campaign.input';
import { UpdateUnsubscribeTopicInput } from 'src/engine/core-modules/emailing-domain/dtos/update-unsubscribe-topic.input';

// The identifiers below are the ones the live browser pass actually carried, on
// false data and with no emission. The prospection bridge derives a campaign id
// with uuid v5 so that re-importing the same rows is idempotent, which is why
// the campaign id here is a v5 and not a v4. The surface used to pin
// @IsUUID('4'), so the server refused the very identifier it had minted.
const LIVE_V5_CAMPAIGN_ID = '21863c22-e759-5ad5-9550-d4cda60568bc';
const LIVE_V4_BATCH_ID = 'c55b5afa-3b33-4c9b-823b-c02d5b72b64b';
const LIVE_V4_WORKSPACE_ID = 'fb086bda-26f3-496e-8e3d-cb545b40b94c';

// Derived exactly as hermes-prospection.service.ts derives it, so the fixture
// cannot drift away from the real derivation: listId = v5('list', campaignId).
const LIVE_V5_LIST_ID = v5('list', LIVE_V5_CAMPAIGN_ID);

const NOT_A_UUID = 'pas-un-uuid';

const errorsFor = async (input: object) =>
  (await validate(input)).map((error) => ({
    property: error.property,
    messages: Object.values(error.constraints ?? {}),
  }));

const propertyErrors = async (input: object, property: string) =>
  (await errorsFor(input)).filter((error) => error.property === property);

describe('campaign surface identifier validation', () => {
  it('should mint the live campaign and list identifiers as uuid v5', () => {
    // Guards the premise of the whole spec: if these ever stop being v5, the
    // regression this file protects against no longer exists in this shape.
    expect(LIVE_V5_CAMPAIGN_ID[14]).toBe('5');
    expect(LIVE_V5_LIST_ID[14]).toBe('5');
    expect(LIVE_V4_BATCH_ID[14]).toBe('4');
    expect(LIVE_V4_WORKSPACE_ID[14]).toBe('4');
  });

  describe("the live journey's shape: qualification then draft then preview", () => {
    it('should accept the v5 campaign id the bridge minted, on the send preview', async () => {
      const input = Object.assign(new PreviewMessageCampaignSendInput(), {
        campaignId: LIVE_V5_CAMPAIGN_ID,
      });

      expect(await validate(input)).toEqual([]);
    });

    it('should accept the v5 list id the bridge derived, on the audience read', async () => {
      const input = Object.assign(new PreviewMessageCampaignAudienceInput(), {
        listId: LIVE_V5_LIST_ID,
      });

      expect(await validate(input)).toEqual([]);
    });

    it('should accept the v5 campaign id on the recipient preview', async () => {
      const input = Object.assign(new PreviewMessageCampaignRecipientInput(), {
        campaignId: LIVE_V5_CAMPAIGN_ID,
      });

      expect(await validate(input)).toEqual([]);
    });
  });

  describe('every campaign, person and list identifier on this surface', () => {
    // One entry per identifier field that used to be pinned to v4. Each is
    // checked against both versions in real use, because the product mints v4
    // for randomly created records and v5 for the bridge's derived ones.
    it.each([
      ['PreviewMessageCampaignSendInput.campaignId', () => new PreviewMessageCampaignSendInput(), 'campaignId'],
      ['PreviewMessageCampaignAudienceInput.listId', () => new PreviewMessageCampaignAudienceInput(), 'listId'],
      ['PreviewMessageCampaignAudienceInput.unsubscribeTopicId', () => Object.assign(new PreviewMessageCampaignAudienceInput(), { listId: LIVE_V5_LIST_ID }), 'unsubscribeTopicId'],
      ['PreviewMessageCampaignRecipientInput.campaignId', () => new PreviewMessageCampaignRecipientInput(), 'campaignId'],
      ['PreviewMessageCampaignRecipientInput.personId', () => Object.assign(new PreviewMessageCampaignRecipientInput(), { campaignId: LIVE_V5_CAMPAIGN_ID }), 'personId'],
      ['SendMessageCampaignInput.campaignId', () => new SendMessageCampaignInput(), 'campaignId'],
      ['CancelMessageCampaignInput.campaignId', () => new CancelMessageCampaignInput(), 'campaignId'],
      ['UpdateUnsubscribeTopicInput.id', () => new UpdateUnsubscribeTopicInput(), 'id'],
      ['FindMessageSuppressionsInput.unsubscribeTopicId', () => Object.assign(new FindMessageSuppressionsInput(), { limit: 30, offset: 0 }), 'unsubscribeTopicId'],
      ['CreateMessageSuppressionInput.unsubscribeTopicId', () => Object.assign(new CreateMessageSuppressionInput(), { emailAddress: 'ada@client.com' }), 'unsubscribeTopicId'],
      ['SendMessageCampaignTestInput.unsubscribeTopicId', () => Object.assign(new SendMessageCampaignTestInput(), { toAddress: 'ada@client.com', fromAddress: 'news@example.com', subject: 'Offre', body: 'Bonjour' }), 'unsubscribeTopicId'],
    ])('should accept a deterministic v5 identifier on %s', async (_label, build, property) => {
      const input = Object.assign(build(), { [property]: LIVE_V5_CAMPAIGN_ID });

      expect(await propertyErrors(input, property)).toEqual([]);
    });

    it.each([
      ['PreviewMessageCampaignSendInput.campaignId', () => new PreviewMessageCampaignSendInput(), 'campaignId'],
      ['PreviewMessageCampaignAudienceInput.listId', () => new PreviewMessageCampaignAudienceInput(), 'listId'],
      ['PreviewMessageCampaignAudienceInput.unsubscribeTopicId', () => Object.assign(new PreviewMessageCampaignAudienceInput(), { listId: LIVE_V5_LIST_ID }), 'unsubscribeTopicId'],
      ['PreviewMessageCampaignRecipientInput.campaignId', () => new PreviewMessageCampaignRecipientInput(), 'campaignId'],
      ['PreviewMessageCampaignRecipientInput.personId', () => Object.assign(new PreviewMessageCampaignRecipientInput(), { campaignId: LIVE_V5_CAMPAIGN_ID }), 'personId'],
      ['SendMessageCampaignInput.campaignId', () => new SendMessageCampaignInput(), 'campaignId'],
      ['CancelMessageCampaignInput.campaignId', () => new CancelMessageCampaignInput(), 'campaignId'],
      ['UpdateUnsubscribeTopicInput.id', () => new UpdateUnsubscribeTopicInput(), 'id'],
      ['FindMessageSuppressionsInput.unsubscribeTopicId', () => Object.assign(new FindMessageSuppressionsInput(), { limit: 30, offset: 0 }), 'unsubscribeTopicId'],
      ['CreateMessageSuppressionInput.unsubscribeTopicId', () => Object.assign(new CreateMessageSuppressionInput(), { emailAddress: 'ada@client.com' }), 'unsubscribeTopicId'],
      ['SendMessageCampaignTestInput.unsubscribeTopicId', () => Object.assign(new SendMessageCampaignTestInput(), { toAddress: 'ada@client.com', fromAddress: 'news@example.com', subject: 'Offre', body: 'Bonjour' }), 'unsubscribeTopicId'],
    ])('should still accept a random v4 identifier on %s', async (_label, build, property) => {
      // Widening to v5 must not swap one exclusion for another: v4 is what
      // every natively created record carries.
      const input = Object.assign(build(), { [property]: LIVE_V4_BATCH_ID });

      expect(await propertyErrors(input, property)).toEqual([]);
    });

    it.each([
      ['PreviewMessageCampaignSendInput.campaignId', () => new PreviewMessageCampaignSendInput(), 'campaignId'],
      ['PreviewMessageCampaignAudienceInput.listId', () => new PreviewMessageCampaignAudienceInput(), 'listId'],
      ['PreviewMessageCampaignAudienceInput.unsubscribeTopicId', () => Object.assign(new PreviewMessageCampaignAudienceInput(), { listId: LIVE_V5_LIST_ID }), 'unsubscribeTopicId'],
      ['PreviewMessageCampaignRecipientInput.campaignId', () => new PreviewMessageCampaignRecipientInput(), 'campaignId'],
      ['PreviewMessageCampaignRecipientInput.personId', () => Object.assign(new PreviewMessageCampaignRecipientInput(), { campaignId: LIVE_V5_CAMPAIGN_ID }), 'personId'],
      ['SendMessageCampaignInput.campaignId', () => new SendMessageCampaignInput(), 'campaignId'],
      ['CancelMessageCampaignInput.campaignId', () => new CancelMessageCampaignInput(), 'campaignId'],
      ['UpdateUnsubscribeTopicInput.id', () => new UpdateUnsubscribeTopicInput(), 'id'],
      ['FindMessageSuppressionsInput.unsubscribeTopicId', () => Object.assign(new FindMessageSuppressionsInput(), { limit: 30, offset: 0 }), 'unsubscribeTopicId'],
      ['CreateMessageSuppressionInput.unsubscribeTopicId', () => Object.assign(new CreateMessageSuppressionInput(), { emailAddress: 'ada@client.com' }), 'unsubscribeTopicId'],
      ['SendMessageCampaignTestInput.unsubscribeTopicId', () => Object.assign(new SendMessageCampaignTestInput(), { toAddress: 'ada@client.com', fromAddress: 'news@example.com', subject: 'Offre', body: 'Bonjour' }), 'unsubscribeTopicId'],
    ])('should still refuse a string that is not a uuid at all on %s', async (_label, build, property) => {
      // The field stays a uuid. Widening the accepted version must not widen
      // the accepted shape to any string.
      const input = Object.assign(build(), { [property]: NOT_A_UUID });

      expect(await propertyErrors(input, property)).toEqual([
        { property, messages: [`${property} must be a UUID`] },
      ]);
    });
  });

  describe('what the validator does not decide', () => {
    it('should carry no workspace or tenant field, because shape is not authorisation', async () => {
      // The campaign surface resolves the workspace from the authenticated
      // session, never from the input. A campaign from another company is
      // refused by the workspace-scoped repository read, not here, which is why
      // relaxing the uuid version cannot weaken tenant isolation. See the
      // company-scoping cases in
      // message-campaign-recipient-preview.service.spec.ts.
      const input = Object.assign(new PreviewMessageCampaignSendInput(), {
        campaignId: LIVE_V5_CAMPAIGN_ID,
        workspaceId: LIVE_V4_WORKSPACE_ID,
      });

      expect(Object.keys(new PreviewMessageCampaignSendInput())).not.toContain(
        'workspaceId',
      );
      // An unknown property is not validated here and is dropped downstream, so
      // no caller can smuggle a workspace through this input.
      expect(await validate(input)).toEqual([]);
    });
  });
});
