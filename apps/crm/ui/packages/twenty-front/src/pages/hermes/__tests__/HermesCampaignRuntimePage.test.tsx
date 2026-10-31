import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { HermesCampaignRuntimePage } from '~/pages/hermes/HermesCampaignRuntimePage';

jest.mock('@/information-banner/components/InformationBannerWrapper', () => ({
  InformationBannerWrapper: () => <div />,
}));

// Stands in for the runtime container. The real one keeps the unsaved
// content, schedule, sender choice and typed test address in local state;
// this keeps a draft in local state too, so whether the route remounted is
// readable in the DOM rather than asserted on an internal.
jest.mock(
  '@/hermes-campaigns-runtime/components/HermesCampaignRuntimeContainer',
  () => {
    const { useState } = require('react');

    return {
      HermesCampaignRuntimeContainer: ({
        campaignId,
      }: {
        campaignId: string;
      }) => {
        const [draft, setDraft] = useState('');

        return (
          <div>
            <span>{`Campaign ${campaignId}`}</span>
            <input
              aria-label="Draft"
              value={draft}
              onChange={(event: { target: { value: string } }) => {
                setDraft(event.target.value);
              }}
            />
          </div>
        );
      },
    };
  },
);

const GoToCampaign = ({ campaignId }: { campaignId: string }) => {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate(`/hermes/campagnes/${campaignId}`)}>
      {`Go to ${campaignId}`}
    </button>
  );
};

const renderPageAt = (path: string) =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <GoToCampaign campaignId="cmp-b" />
        <Routes>
          <Route
            path="/hermes/campagnes/:campaignId"
            element={<HermesCampaignRuntimePage />}
          />
          <Route
            path="/hermes/campagnes"
            element={<HermesCampaignRuntimePage />}
          />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

describe('HermesCampaignRuntimePage', () => {
  it('gives each campaign its own runtime, so a draft typed on one does not follow the operator to another', async () => {
    renderPageAt('/hermes/campagnes/cmp-a');

    expect(screen.getByText('Campaign cmp-a')).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText('Draft'),
      'Rethink your shopfront',
    );

    expect(screen.getByLabelText('Draft')).toHaveValue(
      'Rethink your shopfront',
    );

    await userEvent.click(screen.getByText('Go to cmp-b'));

    // The second campaign is open, and it is open empty. Without the key on
    // the container React would reuse the first campaign's instance and the
    // text above would still be sitting there, one save away from being
    // written onto cmp-b.
    expect(screen.getByText('Campaign cmp-b')).toBeInTheDocument();
    expect(screen.getByLabelText('Draft')).toHaveValue('');
  });

  it('still renders the runtime for the campaign in the address', () => {
    renderPageAt('/hermes/campagnes/cmp-a');

    expect(screen.getByText('Campaign cmp-a')).toBeInTheDocument();
    expect(screen.getByLabelText('Draft')).toBeInTheDocument();
  });

  it('says what to do when the address carries no campaign', () => {
    renderPageAt('/hermes/campagnes');

    expect(screen.queryByLabelText('Draft')).not.toBeInTheDocument();
    expect(screen.getByText(/No campaign is open/)).toBeInTheDocument();
  });
});
