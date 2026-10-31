import { ApolloLink } from '@apollo/client/link';
import { MockLink } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JotaiProvider } from 'jotai';

import { PREVIEW_MESSAGE_CAMPAIGN_SEND } from '@/activities/emails/graphql/metadata-queries/previewMessageCampaignSend';
import { UNSUBSCRIBE_TOPICS } from '@/activities/emails/graphql/metadata-queries/unsubscribeTopics';
import { SEND_MESSAGE_CAMPAIGN } from '@/activities/emails/graphql/mutations/sendMessageCampaign';
import { SEND_MESSAGE_CAMPAIGN_TEST } from '@/activities/emails/graphql/mutations/sendMessageCampaignTest';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { HermesCampaignRuntimeContainer } from '@/hermes-campaigns-runtime/components/HermesCampaignRuntimeContainer';
import { HERMES_CONNECTIONS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesConnectionsV4';
import { HERMES_RUNTIME_CAMPAIGN_AUDIENCES } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignAudiences';
import { HERMES_RUNTIME_CAMPAIGN_RECIPIENTS } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignRecipients';
import { HERMES_RUNTIME_CAMPAIGN_RECORD } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignRecord';
import { HERMES_RUNTIME_UPDATE_CAMPAIGN } from '@/hermes-campaigns-runtime/graphql/mutations/hermesRuntimeUpdateCampaign';
import { PREVIEW_MESSAGE_CAMPAIGN_RECIPIENT } from '@/hermes-campaigns-runtime/graphql/queries/previewMessageCampaignRecipient';
import { GET_MY_MESSAGE_CHANNELS } from '@/settings/accounts/graphql/queries/getMyMessageChannels';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import {
  FeatureFlagKey,
  MessageChannelContactAutoCreationPolicy,
  MessageChannelSyncStage,
  MessageChannelSyncStatus,
  MessageChannelType,
  MessageChannelVisibility,
  MessageFolderImportPolicy,
  MessageSuppressionReason,
  MessageSuppressionsDocument,
  UnsubscribeTopicVisibility,
} from '~/generated-metadata/graphql';
import { mockCurrentWorkspace } from '~/testing/mock-data/users';

const CAMPAIGN_ID = '20202020-7b6e-4f2b-8d0a-2b1c3d4e5f60';
const SENDER_ADDRESS = 'contact@atelier-fontaine.fr';

// Every operation the container is allowed to send at mount is a read. The
// two emitting mutations are mocked too, so that an emission would be
// recorded here rather than disappearing into an unmatched operation.
const EMITTING_OPERATION_NAMES = [
  'SendMessageCampaign',
  'SendMessageCampaignTest',
];

const campaignRecordMock = {
  request: {
    query: HERMES_RUNTIME_CAMPAIGN_RECORD,
    variables: { campaignId: CAMPAIGN_ID },
  },
  result: {
    data: {
      messageCampaign: {
        __typename: 'MessageCampaign',
        id: CAMPAIGN_ID,
        name: 'Shopfitting — Loire-Atlantique',
        subject: 'Rethink your shopfront',
        bodyTemplate: 'Hello',
        fromAddress: { __typename: 'Emails', primaryEmail: SENDER_ADDRESS },
        listId: '30303030-1111-4222-8333-444455556666',
        unsubscribeTopicId: null,
        status: 'DRAFT',
        scheduledAt: null,
        sentAt: null,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        bouncedCount: 0,
        complainedCount: 0,
        skippedCount: 0,
        uniqueOpenCount: 0,
        uniqueClickCount: 0,
      },
    },
  },
};

const sendPreviewMock = {
  request: {
    query: PREVIEW_MESSAGE_CAMPAIGN_SEND,
    variables: { input: { campaignId: CAMPAIGN_ID } },
  },
  result: {
    data: {
      previewMessageCampaignSend: {
        __typename: 'PreviewMessageCampaignSendOutputDTO',
        audience: {
          __typename: 'CampaignAudiencePreviewDTO',
          totalMembers: 12,
          withoutEmail: 1,
          duplicateEmails: 2,
          hardSuppressed: 1,
          globallyUnsubscribed: 1,
          topicUnsubscribed: 0,
          trackingRefused: 3,
          sendable: 7,
        },
        blockers: [],
      },
    },
  },
};

const audiencesMock = {
  request: {
    query: HERMES_RUNTIME_CAMPAIGN_AUDIENCES,
    variables: {
      orderBy: [{ createdAt: 'DescNullsLast' }],
      limit: 50,
    },
  },
  result: {
    data: {
      messageLists: {
        __typename: 'MessageListConnection',
        edges: [
          {
            __typename: 'MessageListEdge',
            node: {
              __typename: 'MessageList',
              id: '30303030-1111-4222-8333-444455556666',
              name: 'Architects, Lyon',
              description: null,
              createdAt: '2026-10-20T08:00:00.000Z',
            },
          },
        ],
        totalCount: 1,
      },
    },
  },
};

// No central MAIL connection on this workspace. So no identity is the
// registered mailbox, nothing is attested, and the sender stays unknown —
// which is the closed-by-default state, not a failure.
const connectionsMock = {
  request: { query: HERMES_CONNECTIONS_V4, variables: {} },
  result: {
    data: {
      hermesConnectionsV4: [
        { kind: 'MAIL', state: 'NOT_CONFIGURED', connectionId: null },
      ],
    },
  },
};

const recipientsMock = {
  request: {
    query: HERMES_RUNTIME_CAMPAIGN_RECIPIENTS,
    variables: { listId: '30303030-1111-4222-8333-444455556666', limit: 50 },
  },
  result: {
    data: {
      messageListMembers: {
        __typename: 'MessageListMemberConnection',
        edges: [
          {
            __typename: 'MessageListMemberEdge',
            node: {
              __typename: 'MessageListMember',
              id: '40404040-1111-4222-8333-444455556666',
              listId: '30303030-1111-4222-8333-444455556666',
              personId: '50505050-1111-4222-8333-444455556666',
              person: {
                __typename: 'Person',
                id: '50505050-1111-4222-8333-444455556666',
                name: {
                  __typename: 'FullName',
                  firstName: 'Camille',
                  lastName: 'Roy',
                },
                emails: {
                  __typename: 'Emails',
                  primaryEmail: 'camille.roy@atelier-fontaine.fr',
                },
              },
            },
          },
        ],
        totalCount: 1,
      },
    },
  },
};

// Writing to the campaign record is not an emission, but it must still not
// happen on its own: this trap proves no save is attempted at mount.
const persistenceTrap = {
  request: { query: HERMES_RUNTIME_UPDATE_CAMPAIGN, variables: () => true },
  result: () => {
    emissionTrap('HermesRuntimeUpdateCampaign');

    return { data: null };
  },
};

// Rendering a preview emits nothing, but it must not run unasked either.
const recipientPreviewTrap = {
  request: {
    query: PREVIEW_MESSAGE_CAMPAIGN_RECIPIENT,
    variables: () => true,
  },
  result: () => {
    emissionTrap('PreviewMessageCampaignRecipient');

    return { data: null };
  },
};

const messageChannelsMock = {
  request: { query: GET_MY_MESSAGE_CHANNELS, variables: {} },
  result: {
    data: {
      myMessageChannels: [
        {
          __typename: 'MessageChannel',
          id: 'mc-group',
          handle: 'inbound-7f3a@inbound.kovaa.test',
          displayName: 'Atelier Fontaine',
          visibility: MessageChannelVisibility.SHARE_EVERYTHING,
          type: MessageChannelType.EMAIL_GROUP,
          isContactAutoCreationEnabled: true,
          contactAutoCreationPolicy:
            MessageChannelContactAutoCreationPolicy.SENT_AND_RECEIVED,
          messageFolderImportPolicy: MessageFolderImportPolicy.ALL_FOLDERS,
          excludeNonProfessionalEmails: false,
          excludeGroupEmails: false,
          isSyncEnabled: true,
          syncStatus: MessageChannelSyncStatus.ACTIVE,
          syncStage: MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING,
          syncStageStartedAt: null,
          importProgress: null,
          connectedAccountId: 'ca-group',
          connectedAccount: {
            __typename: 'ConnectedAccountPublicDTO',
            id: 'ca-group',
            handle: SENDER_ADDRESS,
          },
          createdAt: '2026-10-01T08:00:00.000Z',
          updatedAt: '2026-10-01T08:00:00.000Z',
        },
        // Same domain, a real mailbox, no delegation: the case the identity
        // section exists for.
        {
          __typename: 'MessageChannel',
          id: 'mc-personal',
          handle: 'promo@atelier-fontaine.fr',
          displayName: 'Promotions',
          visibility: MessageChannelVisibility.SHARE_EVERYTHING,
          type: MessageChannelType.EMAIL,
          isContactAutoCreationEnabled: true,
          contactAutoCreationPolicy:
            MessageChannelContactAutoCreationPolicy.SENT_AND_RECEIVED,
          messageFolderImportPolicy: MessageFolderImportPolicy.ALL_FOLDERS,
          excludeNonProfessionalEmails: false,
          excludeGroupEmails: false,
          isSyncEnabled: true,
          syncStatus: MessageChannelSyncStatus.ACTIVE,
          syncStage: MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING,
          syncStageStartedAt: null,
          importProgress: null,
          connectedAccountId: 'ca-personal',
          connectedAccount: {
            __typename: 'ConnectedAccountPublicDTO',
            id: 'ca-personal',
            handle: 'promo@atelier-fontaine.fr',
          },
          createdAt: '2026-10-02T08:00:00.000Z',
          updatedAt: '2026-10-02T08:00:00.000Z',
        },
      ],
    },
  },
};

const unsubscribeTopicsMock = {
  request: { query: UNSUBSCRIBE_TOPICS, variables: {} },
  result: {
    data: {
      unsubscribeTopics: [
        {
          __typename: 'UnsubscribeTopic',
          id: 'topic-b2b',
          name: 'B2B prospecting',
          description: null,
          visibility: UnsubscribeTopicVisibility.PUBLIC,
        },
      ],
    },
  },
};

const suppressionsMock = {
  request: {
    query: MessageSuppressionsDocument,
    variables: { input: { limit: 100, offset: 0 } },
  },
  result: {
    data: {
      messageSuppressions: {
        __typename: 'MessageSuppressionList',
        totalCount: 1,
        records: [
          {
            __typename: 'MessageSuppression',
            id: 'sup-1',
            createdAt: '2026-10-20T10:00:00.000Z',
            emailAddress: 'refus@exemple-client.fr',
            reason: MessageSuppressionReason.UNSUBSCRIBE,
            unsubscribeTopicId: 'topic-b2b',
          },
        ],
      },
    },
  },
};

const PREVIEW_PERSON_ID = '50505050-1111-4222-8333-444455556666';

// A real rendering for the one recipient the list resolved. Personalised, so
// that a test asserting on it cannot pass against an empty panel.
const recipientPreviewMock = {
  request: {
    query: PREVIEW_MESSAGE_CAMPAIGN_RECIPIENT,
    variables: {
      input: { campaignId: CAMPAIGN_ID, personId: PREVIEW_PERSON_ID },
    },
  },
  result: {
    data: {
      previewMessageCampaignRecipient: {
        personId: PREVIEW_PERSON_ID,
        email: 'camille.roy@atelier-fontaine.fr',
        subject: 'Rethink your shopfront, Camille',
        html: '<p>Bonjour Camille Roy</p>',
        plainText: 'Bonjour Camille Roy',
        variablesUsed: ['fullName'],
        isRecipientSendable: true,
        recipientExclusionReason: null,
        envelope: {
          fromAddress: SENDER_ADDRESS,
          senderStatus: 'VERIFIED',
          openMarkerWouldBeIncluded: true,
          clickTrackingWouldBeApplied: false,
          unsubscribeLinkWouldBeIncluded: true,
        },
      },
    },
  },
};

// Mocked so that an emission would be served and recorded instead of failing
// as an unmatched operation. If either of these ever runs, the test fails.
const emissionTrap = jest.fn();

const sendCampaignTrap = {
  request: { query: SEND_MESSAGE_CAMPAIGN, variables: () => true },
  result: () => {
    emissionTrap('SendMessageCampaign');

    return { data: null };
  },
};

const sendTestTrap = {
  request: { query: SEND_MESSAGE_CAMPAIGN_TEST, variables: () => true },
  result: () => {
    emissionTrap('SendMessageCampaignTest');

    return { data: null };
  },
};

// The preview mock is swappable: most tests keep the trap, which fails if a
// preview runs unasked, while the preview test serves a real rendering.
const renderContainer = ({
  previewRecipientMock = recipientPreviewTrap as object,
}: { previewRecipientMock?: object } = {}) => {
  resetJotaiStore();
  jotaiStore.set(currentWorkspaceState.atom, {
    ...mockCurrentWorkspace,
    featureFlags: [
      { key: FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED, value: true },
    ],
  });

  const sentOperationNames: string[] = [];

  const recordingLink = new ApolloLink((operation, forward) => {
    sentOperationNames.push(operation.operationName ?? 'anonymous');

    return forward(operation);
  });

  render(
    <JotaiProvider store={jotaiStore}>
      <I18nProvider i18n={i18n}>
        <MockedProvider
          link={ApolloLink.from([
            recordingLink,
            new MockLink([
              campaignRecordMock,
              recipientsMock,
              audiencesMock,
              connectionsMock,
              persistenceTrap,
              previewRecipientMock,
              sendPreviewMock,
              messageChannelsMock,
              unsubscribeTopicsMock,
              suppressionsMock,
              sendCampaignTrap,
              sendTestTrap,
            ]),
          ])}
        >
          <HermesCampaignRuntimeContainer campaignId={CAMPAIGN_ID} />
        </MockedProvider>
      </I18nProvider>
    </JotaiProvider>,
  );

  return { sentOperationNames };
};

describe('HermesCampaignRuntimeContainer', () => {
  beforeEach(() => {
    emissionTrap.mockClear();
  });

  it('renders the campaign from the engine and emits nothing at mount', async () => {
    const { sentOperationNames } = renderContainer();

    // The screen is up, with the campaign the server published.
    expect(
      await screen.findByText('Shopfitting — Loire-Atlantique'),
    ).toBeVisible();

    // The server's own audience figure, not a count recomputed here.
    expect(
      await screen.findByText(
        '7 retained recipients, as the server counted them.',
      ),
    ).toBeVisible();

    // Nothing was emitted, and nothing was even attempted.
    expect(emissionTrap).not.toHaveBeenCalled();
    expect(
      sentOperationNames.filter((name) =>
        EMITTING_OPERATION_NAMES.includes(name),
      ),
    ).toEqual([]);

    // What did run are the reads.
    expect(sentOperationNames).toContain('HermesRuntimeCampaignRecord');
    expect(sentOperationNames).toContain('PreviewMessageCampaignSend');
    expect(sentOperationNames).toContain('MyMessageChannels');

    // Both steps are wired now, and both still start shut — but for their
    // real reason, stated as this screen's own requirement rather than as a
    // refusal by the server or as a missing callback.
    for (const label of [
      'Render a recipient preview',
      'Send the test to this address',
    ]) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    }

    expect(
      screen.getByText('Choose the recipient to preview first.'),
    ).toBeVisible();

    // The test is shut one level earlier than the destination: this workspace
    // has no central MAIL connection, so no identity is the registered
    // mailbox and nothing attests one. Closed by default, with the reason in
    // the page — not because a callback is missing.
    expect(
      screen.getAllByText(
        'Unavailable: the sender identity this would run under is not authorised.',
      ).length,
    ).toBeGreaterThan(0);

    // The test destination is a field the operator fills in. There is no
    // default and no implicit fallback to the signed-in user's mailbox.
    const destinationField = screen.getByLabelText('Test destination');

    expect(destinationField).toBeVisible();
    expect(destinationField).toHaveValue('');

    // The content can actually be recorded, which is what makes an edit
    // survive a reload.
    expect(
      screen.getByRole('button', { name: 'Record the content' }),
    ).toBeVisible();

    // The recipients of the campaign's own list were read, so a preview can
    // be asked for a named person.
    expect(sentOperationNames).toContain('HermesRuntimeCampaignRecipients');

    // And the campaign can actually be given an audience from this screen:
    // the lists were read and the control is here, rather than the operator
    // being sent elsewhere.
    expect(sentOperationNames).toContain('HermesRuntimeCampaignAudiences');
    expect(screen.getByLabelText('Audience list')).toBeVisible();
    expect(screen.getByLabelText('Unsubscribe topic')).toBeVisible();

    // No central MAIL connection on this workspace, so no mailbox is
    // attested and the sender is not presented as proven.
    expect(
      screen.getByText(
        'Being the registered mailbox does not prove the transport works. That stays unproven until a test or a send says otherwise.',
      ),
    ).toBeVisible();

    // A draft cannot be cancelled, and that is the server's own refusal code.
    expect(
      screen.getByRole('button', { name: 'Cancel the schedule' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getAllByText('MESSAGE_CAMPAIGN_NOT_CANCELABLE').length,
    ).toBeGreaterThan(0);
  });

  // Driven through a real ApolloClient rather than a mocked hook, because the
  // defect this covers was the wrong Apollo hook inside the hook: a query
  // document handed to `useMutation`, which Apollo refuses at call time. A
  // mocked hook cannot see that, and a "does not throw" assertion would not
  // have caught the panel staying empty either.
  it('renders the recipient preview through a real client, and emits nothing', async () => {
    const { sentOperationNames } = renderContainer({
      previewRecipientMock: recipientPreviewMock,
    });

    expect(
      await screen.findByText('Shopfitting — Loire-Atlantique'),
    ).toBeVisible();

    // Pick the recipient through the real Select, as an operator does.
    await userEvent.click(
      screen.getByRole('combobox', { name: 'Recipient to preview' }),
    );
    await userEvent.click(
      await screen.findByText('Camille Roy · camille.roy@atelier-fontaine.fr'),
    );

    const previewButton = screen.getByRole('button', {
      name: 'Render a recipient preview',
    });

    // Choosing a recipient is what opens the control.
    expect(previewButton).not.toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(previewButton);

    // The personalised rendering is actually on screen. This is the
    // assertion the mechanism error broke: the throw left the panel empty.
    expect(
      await screen.findByText('Rethink your shopfront, Camille'),
    ).toBeVisible();
    expect(screen.getByText('Bonjour Camille Roy')).toBeVisible();
    expect(screen.getByText('camille.roy@atelier-fontaine.fr')).toBeVisible();
    expect(
      screen.getByText('Variables resolved for this recipient: {{fullName}}'),
    ).toBeVisible();

    // The preview really did go to the server, as a query.
    expect(sentOperationNames).toContain('PreviewMessageCampaignRecipient');

    // And it emitted nothing: no send, no test, no SMTP handover.
    expect(emissionTrap).not.toHaveBeenCalled();
    expect(
      sentOperationNames.filter((name) =>
        EMITTING_OPERATION_NAMES.includes(name),
      ),
    ).toEqual([]);
  });
});
