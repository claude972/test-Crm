import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import {
  HermesCampaignListView,
  type HermesCampaignListViewProps,
} from '@/hermes-campaigns-ui/components/HermesCampaignListView';
import { type HermesCampaignListEntry } from '@/hermes-campaigns-ui/types/HermesCampaignListEntry';

const draftEntry: HermesCampaignListEntry = {
  id: 'cmp-1',
  name: 'Shopfitting — Loire-Atlantique',
  subject: 'Rethink your shopfront',
  state: 'draft',
  unknownStatus: null,
  scheduledAt: null,
  sentAt: null,
  createdAt: '2026-10-29T08:00:00.000Z',
  sentCount: null,
  failedCount: null,
};

const sentEntry: HermesCampaignListEntry = {
  id: 'cmp-2',
  name: 'Architects, Lyon',
  subject: null,
  state: 'sent',
  unknownStatus: null,
  scheduledAt: null,
  sentAt: '2026-10-28T09:30:00.000Z',
  createdAt: '2026-10-20T08:00:00.000Z',
  sentCount: 0,
  failedCount: 0,
};

// A status the contract does not know. It must be named, not rounded into one
// of the five states.
const unknownStateEntry: HermesCampaignListEntry = {
  id: 'cmp-3',
  name: null,
  subject: null,
  state: null,
  unknownStatus: 'PAUSED_BY_OPERATOR',
  scheduledAt: null,
  sentAt: null,
  createdAt: null,
  sentCount: null,
  failedCount: null,
};

const renderListView = (
  overrides: Partial<HermesCampaignListViewProps> = {},
) =>
  render(
    <I18nProvider i18n={i18n}>
      <HermesCampaignListView
        campaignsLoad={{
          kind: 'ready',
          value: [draftEntry, sentEntry, unknownStateEntry],
        }}
        onRetry={jest.fn()}
        onOpenCampaign={jest.fn()}
        onCreateCampaign={jest.fn()}
        isCreating={false}
        createFailure={null}
        isCreateUnconfirmed={false}
        totalCount={3}
        // oxlint-disable-next-line react/jsx-props-no-spreading
        {...overrides}
      />
    </I18nProvider>,
  );

describe('HermesCampaignListView', () => {
  it('lists the campaigns with the state each one is really in', () => {
    renderListView();

    expect(screen.getByText('Shopfitting — Loire-Atlantique')).toBeVisible();
    expect(screen.getByText('Draft')).toBeVisible();
    expect(screen.getByText('Sent')).toBeVisible();
  });

  it('names a status outside the contract instead of rounding it into a state', () => {
    renderListView();

    expect(
      screen.getByText('Unknown state: PAUSED_BY_OPERATOR'),
    ).toBeVisible();
    // And a campaign with no name is still reachable, named for what it is.
    expect(screen.getByText('Untitled campaign')).toBeVisible();
  });

  it('keeps an unpublished count unknown rather than showing it as zero', () => {
    renderListView();

    expect(
      screen.getAllByText(
        'The number accepted by the transport is unknown.',
      ).length,
    ).toBeGreaterThan(0);
    // A real zero is shown as a zero, and never confused with the above.
    expect(
      screen.getByText(
        '0 accepted by the transport, which is a handover and not a delivery.',
      ),
    ).toBeVisible();
  });

  it('opens the campaign that was clicked', () => {
    const onOpenCampaign = jest.fn();

    renderListView({ onOpenCampaign });

    screen
      .getByRole('button', { name: /Shopfitting — Loire-Atlantique/ })
      .click();

    expect(onOpenCampaign).toHaveBeenCalledWith('cmp-1');
  });

  it('refuses to create a campaign without a name, and says why', () => {
    const onCreateCampaign = jest.fn();

    renderListView({ onCreateCampaign });

    const createButton = screen.getByRole('button', {
      name: 'Create the campaign',
    });

    expect(createButton).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Give the campaign a name to create it.'),
    ).toBeVisible();

    createButton.click();

    expect(onCreateCampaign).not.toHaveBeenCalled();
  });

  it('says it is reading rather than showing an empty list', () => {
    renderListView({ campaignsLoad: { kind: 'loading' } });

    expect(screen.getByText('Reading…')).toBeVisible();
  });

  it('tells a workspace without the engine apart from one without campaigns', () => {
    renderListView({
      campaignsLoad: { kind: 'not-configured', detail: null },
    });

    expect(screen.getByText('Campaigns are not enabled')).toBeVisible();

    renderListView({ campaignsLoad: { kind: 'empty' } });

    expect(screen.getByText('No campaign yet')).toBeVisible();
  });

  it('shows a failed read as a failure, with its code', () => {
    renderListView({
      campaignsLoad: {
        kind: 'failed',
        reasonCode: 'CAMPAIGN_LIST_READ_FAILED',
        reason: null,
      },
    });

    expect(screen.getByText('The campaigns could not be read')).toBeVisible();
    expect(screen.getByText('CAMPAIGN_LIST_READ_FAILED')).toBeVisible();
  });

  // The create whose result nobody knows. Offering "try again" here is how a
  // workspace ends up with two campaigns for one intention.
  it('reports a create whose outcome is unknown without inviting a second attempt', () => {
    renderListView({
      isCreateUnconfirmed: true,
      createFailure: { reasonCode: 'FAILED', reason: null },
    });

    expect(
      screen.getByText('The outcome of creating the campaign is not known.'),
    ).toBeVisible();
    expect(
      screen.getByText(
        'It may already be in the list below, which has been re-read. Check before creating another one: pressing again could leave you with two.',
      ),
    ).toBeVisible();
    // It is not reported as a plain failure at the same time.
    expect(
      screen.queryByText('The campaign was not created.'),
    ).not.toBeInTheDocument();
  });

  it('says so when nothing is wired to open or create a campaign', () => {
    renderListView({
      onOpenCampaign: undefined,
      onCreateCampaign: undefined,
    });

    expect(
      screen.getByText(
        'This screen has nothing wired to create a campaign, so the control does nothing.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'This screen has nothing wired to open a campaign, so the rows do nothing.',
      ),
    ).toBeVisible();
  });
});
