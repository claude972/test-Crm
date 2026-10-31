import { ApolloLink } from '@apollo/client/link';
import { MockLink } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { HermesCampaignListContainer } from '@/hermes-campaigns-runtime/components/HermesCampaignListContainer';
import { HERMES_RUNTIME_CREATE_CAMPAIGN } from '@/hermes-campaigns-runtime/graphql/mutations/hermesRuntimeCreateCampaign';
import { HERMES_RUNTIME_CAMPAIGN_LIST } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignList';
import { HERMES_RUNTIME_CAMPAIGN_RECORD } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignRecord';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { FeatureFlagKey } from '~/generated-metadata/graphql';
import { mockCurrentWorkspace } from '~/testing/mock-data/users';

// CJ-CAMPAIGN-010. A creation whose outcome is unknown must be reconciled by
// looking the campaign up under the id that was sent, not by re-reading the
// list and returning to idle — which swallowed the error and left the
// operator to guess. And a conflict must never release the id: a conflict is
// the server saying something is already there.

const emptyList = () => ({
  request: {
    query: HERMES_RUNTIME_CAMPAIGN_LIST,
    variables: {
      orderBy: [{ createdAt: 'DescNullsLast' }],
      limit: 50,
    },
  },
  result: {
    data: {
      messageCampaigns: {
        __typename: 'MessageCampaignConnection',
        edges: [],
        pageInfo: {
          __typename: 'PageInfo',
          hasNextPage: false,
          endCursor: null,
        },
        totalCount: 0,
      },
    },
  },
});

// Every create attempt, with the uuid the hook minted captured so the test
// can assert a retry reused it rather than minting a second.
const createAttempts: string[] = [];

// A conflict, with the id that was sent captured so a retry can be checked
// against it.
const createConflictTrap = () => ({
  request: { query: HERMES_RUNTIME_CREATE_CAMPAIGN, variables: () => true },
  maxUsageCount: 10,
  result: (variables: Record<string, unknown>) => {
    const input = variables.input as { id?: string } | undefined;

    createAttempts.push(input?.id ?? 'no-id');

    return {
      errors: [{ message: 'Already exists', extensions: { code: 'CONFLICT' } }],
    };
  },
});

// A transport failure. Declared with `error` rather than thrown inside
// `result`, which MockLink does not turn into a rejection.
const createNetworkFailure = () => ({
  request: { query: HERMES_RUNTIME_CREATE_CAMPAIGN, variables: () => true },
  maxUsageCount: 10,
  error: new Error('Network request failed'),
});

const recordLookup = (exists: boolean) => ({
  request: { query: HERMES_RUNTIME_CAMPAIGN_RECORD, variables: () => true },
  maxUsageCount: 10,
  result: (variables: Record<string, unknown>) => ({
    data: {
      messageCampaign: exists
        ? {
            __typename: 'MessageCampaign',
            id: variables.campaignId,
            name: 'Architects, Lyon',
            subject: null,
            bodyTemplate: null,
            fromAddress: { __typename: 'Emails', primaryEmail: null },
            listId: null,
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
          }
        : null,
    },
  }),
});

const renderList = (mocks: readonly unknown[]) => {
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
            new MockLink(mocks as never[]),
          ])}
        >
          {/* A callback, so opening does not mount the campaign screen. */}
          <HermesCampaignListContainer onOpenCampaign={jest.fn()} />
        </MockedProvider>
      </I18nProvider>
    </JotaiProvider>,
  );

  return { sentOperationNames };
};

// Fills the name and presses create, which is the only way the control opens.
const createCampaignNamed = async (name: string) => {
  const nameField = await screen.findByLabelText('Name of the new campaign');

  fireEvent.change(nameField, { target: { value: name } });
  screen.getByRole('button', { name: 'Create the campaign' }).click();
};

describe('uncertain campaign creation', () => {
  beforeEach(() => {
    createAttempts.length = 0;
  });

  it('reconciles by id and says the campaign was not created', async () => {
    const { sentOperationNames } = renderList([
      emptyList(),
      createNetworkFailure(),
      recordLookup(false),
      emptyList(),
    ]);

    await createCampaignNamed('Architects, Lyon');

    expect(
      await screen.findByText(
        'The outcome of creating the campaign is not known.',
      ),
    ).toBeVisible();

    // Creating is shut on an unknown outcome.
    expect(
      screen.getByRole('button', { name: 'Create the campaign' }),
    ).toHaveAttribute('aria-disabled', 'true');

    screen
      .getByRole('button', { name: 'Check whether it was created' })
      .click();

    expect(
      await screen.findByText('Checked: this campaign was not created.'),
    ).toBeVisible();

    // The question was answered by looking the campaign up by its id, not by
    // re-reading the list and hoping.
    expect(sentOperationNames).toContain('HermesRuntimeCampaignRecord');
  });

  it('reports a failed check as still unknown instead of swallowing it', async () => {
    renderList([
      emptyList(),
      createNetworkFailure(),
      // The lookup itself fails.
      {
        request: {
          query: HERMES_RUNTIME_CAMPAIGN_RECORD,
          variables: () => true,
        },
        error: new Error('Network request failed'),
      },
    ]);

    await createCampaignNamed('Architects, Lyon');

    expect(
      await screen.findByText(
        'The outcome of creating the campaign is not known.',
      ),
    ).toBeVisible();

    screen
      .getByRole('button', { name: 'Check whether it was created' })
      .click();

    expect(
      await screen.findByText(
        'The check itself failed, so it is still unknown whether the campaign was created.',
      ),
    ).toBeVisible();

    // A failed check is not permission to press create again.
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create the campaign' }),
      ).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // A conflict is the server saying something is already there. Releasing the
  // id on it is how a second campaign gets created later.
  it('keeps the same identifier after a conflict rather than minting a new one', async () => {
    renderList([
      emptyList(),
      createConflictTrap(),
      recordLookup(false),
      emptyList(),
    ]);

    await createCampaignNamed('Architects, Lyon');

    // A conflict is treated as an unresolved outcome, not a settled refusal.
    expect(
      await screen.findByText(
        'The outcome of creating the campaign is not known.',
      ),
    ).toBeVisible();

    screen
      .getByRole('button', { name: 'Check whether it was created' })
      .click();

    expect(
      await screen.findByText('Checked: this campaign was not created.'),
    ).toBeVisible();

    // Reconciled as absent, so creating reopens — and the second attempt
    // replays the very same id.
    const createButton = screen.getByRole('button', {
      name: 'Create the campaign',
    });

    await waitFor(() => {
      expect(createButton).toHaveAttribute('aria-disabled', 'false');
    });

    createButton.click();

    await waitFor(() => {
      expect(createAttempts.length).toBe(2);
    });

    expect(createAttempts[0]).toBe(createAttempts[1]);
  });
});
