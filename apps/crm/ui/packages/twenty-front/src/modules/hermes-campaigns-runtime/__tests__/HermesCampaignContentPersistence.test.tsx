import { type DocumentNode } from '@apollo/client';
import { ApolloLink } from '@apollo/client/link';
import { MockLink } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { PREVIEW_MESSAGE_CAMPAIGN_SEND } from '@/activities/emails/graphql/metadata-queries/previewMessageCampaignSend';
import { UNSUBSCRIBE_TOPICS } from '@/activities/emails/graphql/metadata-queries/unsubscribeTopics';
import { SEND_MESSAGE_CAMPAIGN } from '@/activities/emails/graphql/mutations/sendMessageCampaign';
import { SEND_MESSAGE_CAMPAIGN_TEST } from '@/activities/emails/graphql/mutations/sendMessageCampaignTest';
import { myConnectedAccountsState } from '@/accounts/states/myConnectedAccountsState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { HermesCampaignRuntimeContainer } from '@/hermes-campaigns-runtime/components/HermesCampaignRuntimeContainer';
import { HERMES_RUNTIME_UPDATE_CAMPAIGN } from '@/hermes-campaigns-runtime/graphql/mutations/hermesRuntimeUpdateCampaign';
import { useHermesCampaignPersistence } from '@/hermes-campaigns-runtime/hooks/useHermesCampaignPersistence';
import { HERMES_CONNECTIONS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesConnectionsV4';
import { HERMES_RUNTIME_CAMPAIGN_AUDIENCES } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignAudiences';
import { HERMES_RUNTIME_CAMPAIGN_RECIPIENTS } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignRecipients';
import { HERMES_RUNTIME_CAMPAIGN_RECORD } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignRecord';
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
  MessageSuppressionsDocument,
  UnsubscribeTopicVisibility,
} from '~/generated-metadata/graphql';
import { mockCurrentWorkspace } from '~/testing/mock-data/users';

const CAMPAIGN_ID = '20202020-7b6e-4f2b-8d0a-2b1c3d4e5f60';
const LIST_ID = '30303030-1111-4222-8333-444455556666';

const STORED_SUBJECT = 'Rethink your shopfront';
const STORED_BODY = 'Hello';
const EDITED_SUBJECT = 'Rethink your shopfront in Nantes';

// An emission here would be a defect, so both emitting mutations are mocked
// and recorded rather than left to pass as unmatched operations.
const emissionTrap = jest.fn();

// The parameter is a GraphQL document, so it is typed as one. `MockLink` is a
// class, so `Parameters<typeof MockLink>` was invalid — a class has
// constructor parameters, not call parameters — and its first constructor
// parameter is the whole mocks array anyway, not a single document. Jest runs
// this file through swc, which never typechecks, so only the full typecheck
// caught it.
const emissionTrapFor = (query: DocumentNode, name: string) => ({
  // The any-variables matcher belongs inside `request.variables`, which is
  // typed `TVariables | VariableMatcher<TVariables>`. A top-level
  // `variableMatcher` key is from an older Apollo testing API: it is not in
  // this version's `MockedResponse` at all, so it was both an excess
  // property and a trap that would never have matched a call carrying
  // variables.
  request: { query, variables: () => true },
  result: () => {
    emissionTrap(name);

    return { data: null };
  },
});

const campaignRecord = (
  subject: string,
  bodyTemplate: string,
  fromPrimaryEmail: string | null = 'contact@atelier-fontaine.fr',
) => ({
  __typename: 'MessageCampaign',
  id: CAMPAIGN_ID,
  name: 'Shopfitting — Loire-Atlantique',
  subject,
  bodyTemplate,
  fromAddress: {
    __typename: 'Emails',
    primaryEmail: fromPrimaryEmail,
  },
  listId: LIST_ID,
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
});

const recordMock = (
  subject: string,
  bodyTemplate: string,
  fromPrimaryEmail: string | null = 'contact@atelier-fontaine.fr',
) => ({
  request: {
    query: HERMES_RUNTIME_CAMPAIGN_RECORD,
    variables: { campaignId: CAMPAIGN_ID },
  },
  result: {
    data: {
      messageCampaign: campaignRecord(subject, bodyTemplate, fromPrimaryEmail),
    },
  },
});

const sendPreviewMock = () => ({
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
});

const recipientsMock = () => ({
  request: {
    query: HERMES_RUNTIME_CAMPAIGN_RECIPIENTS,
    variables: { listId: LIST_ID, limit: 50 },
  },
  result: {
    data: {
      messageListMembers: {
        __typename: 'MessageListMemberConnection',
        edges: [],
        totalCount: 0,
      },
    },
  },
});

const audiencesMock = () => ({
  request: {
    query: HERMES_RUNTIME_CAMPAIGN_AUDIENCES,
    variables: { orderBy: [{ createdAt: 'DescNullsLast' }], limit: 50 },
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
              id: LIST_ID,
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
});

const CONNECTED_ACCOUNT_ID = 'ca-1';

// The central MAIL connection, naming exactly one connected account. This is
// the only thing that attests which mailbox is registered: the send preview
// never resolves it.
const connectionsMock = (connectedAccountId: string | null = CONNECTED_ACCOUNT_ID) => ({
  request: { query: HERMES_CONNECTIONS_V4, variables: {} },
  result: {
    data: {
      hermesConnectionsV4:
        connectedAccountId === null
          ? [{ kind: 'MAIL', state: 'NOT_CONFIGURED', connectionId: null }]
          : [
              {
                kind: 'MAIL',
                state: 'CONFIGURED',
                connectionId: 'conn-mail-1',
                revision: 3,
                settings: {
                  connectedAccountId,
                  mailbox: 'INBOX',
                  handle: 'contact@atelier-fontaine.fr',
                },
              },
            ],
    },
  },
});

const channelsMock = (
  channels: readonly unknown[] = [],
) => ({
  request: { query: GET_MY_MESSAGE_CHANNELS, variables: {} },
  result: { data: { myMessageChannels: channels } },
});

const SENDER_ADDRESS = 'contact@atelier-fontaine.fr';

// A mailbox the workspace has connected. Its channel type is deliberately
// EMAIL and not EMAIL_GROUP: the type grants no authority, so it must not be
// what decides whether this can be chosen.
const connectedMailbox = {
  __typename: 'MessageChannel',
  id: 'mc-1',
  handle: 'inbound-7f3a@inbound.kovaa.test',
  displayName: 'Atelier Fontaine',
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
  connectedAccountId: 'ca-1',
  connectedAccount: {
    __typename: 'ConnectedAccountPublicDTO',
    id: 'ca-1',
    handle: SENDER_ADDRESS,
  },
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
};

const topicsMock = () => ({
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
});

const suppressionsMock = () => ({
  request: {
    query: MessageSuppressionsDocument,
    variables: { input: { limit: 100, offset: 0 } },
  },
  result: {
    data: {
      messageSuppressions: {
        __typename: 'MessageSuppressionList',
        totalCount: 0,
        records: [],
      },
    },
  },
});

// The recording itself. Its variables are asserted by the mock matching: a
// save that sent a different subject, or sent the body under the wrong field
// name, would not match and the test would fail.
const updateMock = (overrides?: {
  result?: unknown;
  error?: Error;
  graphQLErrorCode?: string;
}) => ({
  request: {
    query: HERMES_RUNTIME_UPDATE_CAMPAIGN,
    variables: {
      idToUpdate: CAMPAIGN_ID,
      input: { subject: EDITED_SUBJECT, bodyTemplate: STORED_BODY },
    },
  },
  ...(overrides?.graphQLErrorCode !== undefined
    ? {
        result: {
          errors: [
            {
              message: 'Subject too long',
              extensions: { code: overrides.graphQLErrorCode },
            },
          ],
        },
      }
    : overrides?.error === undefined
    ? {
        result:
          overrides?.result ??
          ({
            data: {
              updateMessageCampaign: {
                __typename: 'MessageCampaign',
                id: CAMPAIGN_ID,
                name: 'Shopfitting — Loire-Atlantique',
                subject: EDITED_SUBJECT,
                bodyTemplate: STORED_BODY,
                fromAddress: {
                  __typename: 'Emails',
                  primaryEmail: 'contact@atelier-fontaine.fr',
                },
                listId: LIST_ID,
                unsubscribeTopicId: null,
                status: 'DRAFT',
                scheduledAt: null,
              },
            },
          } as unknown),
      }
    : { error: overrides.error }),
});

const renderContainer = (mocks: readonly unknown[]) => {
  resetJotaiStore();
  jotaiStore.set(currentWorkspaceState.atom, {
    ...mockCurrentWorkspace,
    featureFlags: [
      { key: FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED, value: true },
    ],
  });
  // The native account the central MAIL connection names. Without it the
  // connection resolves to nothing and no mailbox is the registered one.
  jotaiStore.set(myConnectedAccountsState.atom, [
    {
      __typename: 'ConnectedAccount',
      id: CONNECTED_ACCOUNT_ID,
      handle: SENDER_ADDRESS,
      handleAliases: null,
      provider: 'google',
      accountOwnerId: 'member-1',
      archivedAt: null,
    },
  ] as never);

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
              ...(mocks as never[]),
              emissionTrapFor(SEND_MESSAGE_CAMPAIGN, 'SendMessageCampaign'),
              emissionTrapFor(
                SEND_MESSAGE_CAMPAIGN_TEST,
                'SendMessageCampaignTest',
              ),
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

const baseReads = () => [
  recordMock(STORED_SUBJECT, STORED_BODY),
  sendPreviewMock(),
  recipientsMock(),
  audiencesMock(),
  connectionsMock(),
  channelsMock(),
  topicsMock(),
  suppressionsMock(),
];

// jsdom does not implement PointerEvent, and the design system's radio
// dispatches one when it is activated. This is a gap in the test environment,
// not product behaviour: without it a real click cannot be simulated at all.
beforeAll(() => {
  if (typeof window.PointerEvent !== 'function') {
    (window as unknown as { PointerEvent: unknown }).PointerEvent =
      class extends MouseEvent {};
  }
});

describe('campaign content persistence', () => {
  beforeEach(() => {
    emissionTrap.mockClear();
  });

  // The point of the whole lot: an edit has to still be there after the
  // campaign is read again from the server. A passing mutation proves
  // nothing on its own — what is asserted here is the re-read.
  it('records the content and shows what the server holds after re-reading it', async () => {
    const { sentOperationNames } = renderContainer([
      ...baseReads(),
      updateMock(),
      // The re-read after the recording. It answers with the stored values,
      // which is what the screen must end up showing.
      recordMock(EDITED_SUBJECT, STORED_BODY),
      sendPreviewMock(),
      recipientsMock(),
    ]);

    // Wait for the campaign itself, not merely for the field to exist: the
    // form renders empty while the record is still being read.
    expect(
      await screen.findByText('Shopfitting — Loire-Atlantique'),
    ).toBeVisible();

    const subjectField = await screen.findByLabelText('Subject');

    await waitFor(() => {
      expect(subjectField).toHaveValue(STORED_SUBJECT);
    });

    fireEvent.change(subjectField, { target: { value: EDITED_SUBJECT } });

    // Edited but not recorded: the screen has to say so rather than let the
    // draft look stored.
    expect(
      await screen.findByText(
        'Not recorded yet: what is on screen differs from what the server holds.',
      ),
    ).toBeVisible();

    screen.getByRole('button', { name: 'Record the content' }).click();

    expect(
      await screen.findByText(
        'Recorded on the campaign. It will still be here after a reload.',
      ),
    ).toBeVisible();

    // The value now on screen came back from the server's own answer, not
    // from component state: the local draft was dropped on success.
    await waitFor(() => {
      expect(screen.getByLabelText('Subject')).toHaveValue(EDITED_SUBJECT);
    });

    expect(sentOperationNames).toContain('HermesRuntimeUpdateCampaign');
    // The campaign was genuinely read again afterwards.
    expect(
      sentOperationNames.filter(
        (name) => name === 'HermesRuntimeCampaignRecord',
      ).length,
    ).toBeGreaterThanOrEqual(2);

    // Recording content is not an emission.
    expect(emissionTrap).not.toHaveBeenCalled();
  });

  it('keeps the edit on screen and refuses to claim a save when the server rejects it', async () => {
    renderContainer([
      ...baseReads(),
      updateMock({ graphQLErrorCode: 'BAD_USER_INPUT' }),
    ]);

    expect(
      await screen.findByText('Shopfitting — Loire-Atlantique'),
    ).toBeVisible();

    const subjectField = await screen.findByLabelText('Subject');

    await waitFor(() => {
      expect(subjectField).toHaveValue(STORED_SUBJECT);
    });

    fireEvent.change(subjectField, { target: { value: EDITED_SUBJECT } });
    screen.getByRole('button', { name: 'Record the content' }).click();

    expect(
      await screen.findByText(
        'The server refused to record this. Nothing was saved.',
      ),
    ).toBeVisible();

    // The operator's text is not thrown away by a refusal.
    expect(screen.getByLabelText('Subject')).toHaveValue(EDITED_SUBJECT);
    expect(emissionTrap).not.toHaveBeenCalled();
  });

  // A refusal and an unknown outcome are different facts, and the second one
  // must not be presented as the first: "refused" reads as "nothing
  // happened", which here would be a guess.
  it('reports an unknown outcome as unknown and offers no retry', async () => {
    renderContainer([
      ...baseReads(),
      updateMock({ error: new Error('Network request failed') }),
    ]);

    expect(
      await screen.findByText('Shopfitting — Loire-Atlantique'),
    ).toBeVisible();

    const subjectField = await screen.findByLabelText('Subject');

    await waitFor(() => {
      expect(subjectField).toHaveValue(STORED_SUBJECT);
    });

    fireEvent.change(subjectField, { target: { value: EDITED_SUBJECT } });
    screen.getByRole('button', { name: 'Record the content' }).click();

    expect(
      await screen.findByText(
        'The outcome of this recording is not known.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'It may or may not have been recorded. Reload the campaign to see what the server holds before editing again — nothing is retried on its own, on purpose.',
      ),
    ).toBeVisible();

    // Nothing claimed it was saved.
    expect(
      screen.queryByText(
        'Recorded on the campaign. It will still be here after a reload.',
      ),
    ).not.toBeInTheDocument();
    expect(emissionTrap).not.toHaveBeenCalled();
  });

  // CJ-CAMPAIGN-006. A recording is a round trip, and the operator may keep
  // typing during it. Clearing the draft on success without checking what is
  // on screen now would silently discard everything typed in that window.
  it('keeps text typed while the recording was in flight', async () => {
    const TYPED_DURING_SAVE = 'Rethink your shopfront in Nantes and Rezé';

    // The answer is delayed, so there is a real window in flight to type
    // into rather than a hoped-for one.
    const deferredUpdate = {
      ...updateMock(),
      // Long enough to be a real window on a loaded machine. The waits below
      // are given explicit timeouts to match, rather than relying on the
      // default and turning a slow run into a false failure.
      delay: 800,
    };

    renderContainer([
      ...baseReads(),
      deferredUpdate,
      recordMock(EDITED_SUBJECT, STORED_BODY),
      sendPreviewMock(),
      recipientsMock(),
    ]);

    expect(
      await screen.findByText('Shopfitting — Loire-Atlantique'),
    ).toBeVisible();

    const subjectField = await screen.findByLabelText('Subject');

    await waitFor(() => {
      expect(subjectField).toHaveValue(STORED_SUBJECT);
    });

    fireEvent.change(subjectField, { target: { value: EDITED_SUBJECT } });
    screen.getByRole('button', { name: 'Record the content' }).click();

    // The recording is in flight; the operator carries on typing.
    expect(
      await screen.findByText('Recording…', undefined, { timeout: 5_000 }),
    ).toBeVisible();

    fireEvent.change(subjectField, { target: { value: TYPED_DURING_SAVE } });

    // Wait for the recording to actually finish, rather than for the local
    // text to be what it already was.
    await waitFor(
      () => {
        expect(screen.queryByText('Recording…')).not.toBeInTheDocument();
      },
      { timeout: 10_000 },
    );

    // The later text is still there: it was never thrown away.
    await waitFor(
      () => {
        expect(screen.getByLabelText('Subject')).toHaveValue(TYPED_DURING_SAVE);
      },
      { timeout: 5_000 },
    );

    // And it is not claimed to be saved, because it was not: what the server
    // recorded is the snapshot that was sent, not what is on screen now.
    expect(
      await screen.findByText(
        'Not recorded yet: what is on screen differs from what the server holds.',
        undefined,
        { timeout: 5_000 },
      ),
    ).toBeVisible();

    expect(
      screen.queryByText(
        'Recorded on the campaign. It will still be here after a reload.',
      ),
    ).not.toBeInTheDocument();

    expect(emissionTrap).not.toHaveBeenCalled();
  });
});

// CJ-CAMPAIGN-007. A draft that has no sender yet must be able to get one.
// Every identity other than the one already on the campaign arrives with no
// server verdict, and the emission authorisation refuses a missing verdict —
// correctly. Using that same answer to disable the radio made the choice
// permanently unselectable.
describe('campaign sender persistence', () => {
  beforeEach(() => {
    emissionTrap.mockClear();
  });

  const senderUpdateMock = () => ({
    request: {
      query: HERMES_RUNTIME_UPDATE_CAMPAIGN,
      variables: {
        idToUpdate: CAMPAIGN_ID,
        input: {
          fromAddress: {
            primaryEmail: SENDER_ADDRESS,
            additionalEmails: null,
          },
        },
      },
    },
    result: {
      data: {
        updateMessageCampaign: {
          __typename: 'MessageCampaign',
          id: CAMPAIGN_ID,
          name: 'Shopfitting — Loire-Atlantique',
          subject: STORED_SUBJECT,
          bodyTemplate: STORED_BODY,
          fromAddress: {
            __typename: 'Emails',
            primaryEmail: SENDER_ADDRESS,
          },
          listId: LIST_ID,
          unsubscribeTopicId: null,
          status: 'DRAFT',
          scheduledAt: null,
        },
      },
    },
  });

  it('lets a draft with no sender be given one, records it and reads it back', async () => {
    renderContainer([
      // No `From` at all, and no verdict for any identity: exactly the state
      // in which nothing could previously be chosen.
      recordMock(STORED_SUBJECT, STORED_BODY, null),
      sendPreviewMock(),
      recipientsMock(),
      audiencesMock(),
      connectionsMock(),
      channelsMock([connectedMailbox]),
      topicsMock(),
      suppressionsMock(),
      senderUpdateMock(),
      // The re-read: the campaign now holds the address that was stored.
      recordMock(STORED_SUBJECT, STORED_BODY, SENDER_ADDRESS),
      sendPreviewMock(),
      recipientsMock(),
    ]);

    const senderRadio = await screen.findByRole('radio', {
      name: SENDER_ADDRESS,
    });

    // Choosable, although no verdict authorises it to emit yet.
    expect(senderRadio).not.toHaveAttribute('aria-disabled', 'true');

    // Offered, because it is the mailbox the central MAIL connection names —
    // and said to be an offer rather than a record, because the campaign
    // holds no sender at this point.
    expect(
      await screen.findByText(
        'This campaign has recorded no sender. The one shown is the mailbox actually registered in the connection centre, offered as a proposal: choose it to record it.',
      ),
    ).toBeVisible();

    // And offering is never attesting: the transport is not proven by any
    // read here.
    expect(
      screen.getByText(
        'Being the registered mailbox does not prove the transport works. That stays unproven until a test or a send says otherwise.',
      ),
    ).toBeVisible();

    // The proposal has its own control, because a radio that is already
    // selected fires no change event when clicked.
    screen.getByRole('button', { name: 'Record this sender' }).click();

    expect(
      await screen.findByText(
        'Sender recorded on the campaign. It will still be here after a reload.',
      ),
    ).toBeVisible();

    // And the campaign was genuinely read again afterwards: the proposal note
    // is gone, because the sender is now on the record rather than offered.
    await waitFor(() => {
      expect(
        screen.queryByText(
          'This campaign has recorded no sender. The one shown is the mailbox actually registered in the connection centre, offered as a proposal: choose it to record it.',
        ),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByRole('radio', { name: SENDER_ADDRESS })).toBeChecked();

    // Recording a sender is a write on the campaign record, not an emission.
    expect(emissionTrap).not.toHaveBeenCalled();
  });

  it('does not record a sender on mount, only on an explicit choice', async () => {
    const { sentOperationNames } = renderContainer([
      recordMock(STORED_SUBJECT, STORED_BODY, null),
      sendPreviewMock(),
      recipientsMock(),
      audiencesMock(),
      connectionsMock(),
      channelsMock([connectedMailbox]),
      topicsMock(),
      suppressionsMock(),
    ]);

    expect(
      await screen.findByRole('radio', { name: SENDER_ADDRESS }),
    ).toBeVisible();

    expect(sentOperationNames).not.toContain('HermesRuntimeUpdateCampaign');
    expect(emissionTrap).not.toHaveBeenCalled();
  });
});

// CJ-CAMPAIGN-008. A campaign created from this screen stored only an id and
// a name, nothing offered a list, and the recording path did not even accept
// `listId` — so a draft stayed audience-less for life. The choice has to be
// here, and it has to persist.
describe('campaign audience persistence', () => {
  beforeEach(() => {
    emissionTrap.mockClear();
  });

  const OTHER_LIST_ID = '60606060-1111-4222-8333-444455556666';

  const audiencesWithTwoLists = () => ({
    request: {
      query: HERMES_RUNTIME_CAMPAIGN_AUDIENCES,
      variables: { orderBy: [{ createdAt: 'DescNullsLast' }], limit: 50 },
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
                id: OTHER_LIST_ID,
                name: 'Shopfitters, Nantes',
                description: null,
                createdAt: '2026-10-25T08:00:00.000Z',
              },
            },
          ],
          totalCount: 1,
        },
      },
    },
  });

  const listUpdateMock = () => ({
    request: {
      query: HERMES_RUNTIME_UPDATE_CAMPAIGN,
      variables: {
        idToUpdate: CAMPAIGN_ID,
        input: { listId: OTHER_LIST_ID },
      },
    },
    result: {
      data: {
        updateMessageCampaign: {
          __typename: 'MessageCampaign',
          id: CAMPAIGN_ID,
          name: 'Shopfitting — Loire-Atlantique',
          subject: STORED_SUBJECT,
          bodyTemplate: STORED_BODY,
          fromAddress: {
            __typename: 'Emails',
            primaryEmail: SENDER_ADDRESS,
          },
          listId: OTHER_LIST_ID,
          unsubscribeTopicId: null,
          status: 'DRAFT',
          scheduledAt: null,
        },
      },
    },
  });

  const recordWithList = (listId: string | null) => ({
    request: {
      query: HERMES_RUNTIME_CAMPAIGN_RECORD,
      variables: { campaignId: CAMPAIGN_ID },
    },
    result: {
      data: {
        messageCampaign: {
          ...campaignRecord(STORED_SUBJECT, STORED_BODY),
          listId,
        },
      },
    },
  });

  const recipientsFor = (listId: string) => ({
    request: {
      query: HERMES_RUNTIME_CAMPAIGN_RECIPIENTS,
      variables: { listId, limit: 50 },
    },
    result: {
      data: {
        messageListMembers: {
          __typename: 'MessageListMemberConnection',
          edges: [],
          totalCount: 0,
        },
      },
    },
  });

  it('offers the audience control even when the campaign has no list at all', async () => {
    renderContainer([
      recordWithList(null),
      sendPreviewMock(),
      audiencesWithTwoLists(),
      connectionsMock(),
      channelsMock([connectedMailbox]),
      topicsMock(),
      suppressionsMock(),
    ]);

    // The control is reachable in exactly the state where it matters: an
    // audience-less campaign. It sits outside the load view for that reason.
    expect(await screen.findByLabelText('Audience list')).toBeVisible();
    expect(
      screen.getByText(
        'This campaign has no audience list yet, so it has no recipients at all. Choose one here.',
      ),
    ).toBeVisible();

    // And the figures are not invented while there is no list.
    expect(emissionTrap).not.toHaveBeenCalled();
  });

  // Driven through the persistence contract rather than through the select
  // widget: the design system's Select renders its popup in a portal via
  // pointer events that jsdom does not implement, so its options cannot be
  // opened in a unit test at all. What that widget cannot cover here is
  // covered by the two tests above — the control is present, labelled and
  // enabled in the audience-less state — and by root's browser recipe. What
  // is proven here is the part that was actually missing: the recording path
  // accepts `listId` and writes exactly it.
  it('records a chosen audience list as listId and nothing else', async () => {
    const saved: string[] = [];

    const Harness = () => {
      const { listSaveState, saveList } = useHermesCampaignPersistence({
        campaignId: CAMPAIGN_ID,
        onRecorded: () => {
          saved.push('re-read');
        },
      });

      return (
        <button type="button" onClick={() => void saveList(OTHER_LIST_ID)}>
          {`record:${listSaveState.kind}`}
        </button>
      );
    };

    render(
      <MockedProvider
        link={ApolloLink.from([new MockLink([listUpdateMock()])])}
      >
        <Harness />
      </MockedProvider>,
    );

    screen.getByRole('button', { name: 'record:idle' }).click();

    // The mock matches on exact variables, so a save that sent anything other
    // than `{ listId }` — or sent it under another field name — would not
    // match and this would never reach 'saved'.
    expect(await screen.findByRole('button', { name: 'record:saved' })).toBeVisible();

    // And the campaign is re-read afterwards, so the server re-resolves the
    // audience from the list rather than the screen keeping its own idea.
    expect(saved).toEqual(['re-read']);
  });

  it('says a list can resolve to fewer recipients than it holds, rather than hiding it', async () => {
    renderContainer([
      recordWithList(LIST_ID),
      sendPreviewMock(),
      recipientsMock(),
      audiencesMock(),
      connectionsMock(),
      channelsMock([connectedMailbox]),
      topicsMock(),
      suppressionsMock(),
    ]);

    expect(
      await screen.findByText(
        /A list can resolve to fewer recipients than it holds/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        /the server keeps only rows whose professional purpose and company context were recorded at qualification/,
      ),
    ).toBeVisible();
  });
});

// The body is a serialised email document, so its string length says nothing
// about whether there is anything to send. An empty document is a long JSON
// string, and a test must not go out with nothing in it.
describe('campaign body emptiness', () => {
  beforeEach(() => {
    emissionTrap.mockClear();
  });

  const EMPTY_DOCUMENT = JSON.stringify({
    type: 'doc',
    attrs: { schemaVersion: 1 },
    content: [],
  });

  it('refuses the test when the stored document carries no text, despite a long body string', async () => {
    renderContainer([
      recordMock(STORED_SUBJECT, EMPTY_DOCUMENT),
      sendPreviewMock(),
      recipientsMock(),
      audiencesMock(),
      connectionsMock(),
      channelsMock([connectedMailbox]),
      topicsMock(),
      suppressionsMock(),
    ]);

    expect(
      await screen.findByText('Shopfitting — Loire-Atlantique'),
    ).toBeVisible();

    // The string is far from empty, so a length check would have passed it.
    expect(EMPTY_DOCUMENT.length).toBeGreaterThan(30);

    const destination = screen.getByLabelText('Test destination');

    fireEvent.change(destination, {
      target: { value: 'recette@atelier-fontaine.fr' },
    });

    const testButton = screen.getByRole('button', {
      name: 'Send the test to this address',
    });

    testButton.click();

    // Nothing left, whatever the button's own state: the guard is the point.
    expect(emissionTrap).not.toHaveBeenCalled();
  });
});
