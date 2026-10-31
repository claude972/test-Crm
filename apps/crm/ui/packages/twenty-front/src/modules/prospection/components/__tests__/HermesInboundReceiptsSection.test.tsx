import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HERMES_INBOUND_ITEM_CLASSIFICATION } from '@/prospection/graphql/metadata-queries/hermesInboundItemClassification';
import { HERMES_INBOUND_RECEIPTS } from '@/prospection/graphql/metadata-queries/hermesInboundReceipts';
import { HermesInboundReceiptsSection } from '@/prospection/components/HermesInboundReceiptsSection';

// The journey this section exists for: the receipts are listed with the
// identifier an operator matches in the provider console, and one can be
// inspected. The traps asserted here are the ones that made the two server
// surfaces worth wiring at all — a page is never presented as a whole set, a
// denial never reads as an empty list, and an unasked booking record is never
// reported as an absent one.
const RECEIPT = {
  __typename: 'HermesInboundReceipt',
  noteId: 'note-1',
  provider: 'HEYFORM',
  eventId: 'evt_[2026].a*b',
  bookingUid: null,
  connectionId: 'connection-1',
  structureId: 'company-1',
  receivedAt: '2026-10-30T12:00:00.000Z',
  attribution: 'VERIFIED',
};

const page = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'HermesInboundReceiptPage',
  status: 'LISTED',
  checkedAt: '2026-10-31T08:00:00.000Z',
  cap: 100,
  truncated: false,
  receipts: [RECEIPT],
  ...overrides,
});

const receiptsMock = (data: unknown): MockedResponse => ({
  request: { query: HERMES_INBOUND_RECEIPTS },
  maxUsageCount: 10,
  result: { data: { hermesInboundReceipts: data } },
});

const renderSection = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <I18nProvider i18n={i18n}>
        <HermesInboundReceiptsSection />
      </I18nProvider>
    </MockedProvider>,
  );

describe('HermesInboundReceiptsSection', () => {
  it('lists the canonical identifier whole, so it can be matched in the provider console', async () => {
    renderSection([receiptsMock(page())]);

    expect(await screen.findByText('evt_[2026].a*b')).toBeVisible();
    expect(screen.getByText('Attribution verified')).toBeVisible();
  });

  it('says a capped page is a prefix instead of showing it as the whole set', async () => {
    renderSection([receiptsMock(page({ truncated: true }))]);

    expect(
      await screen.findByText(
        'Only the 100 most recent receipts are listed; more exist.',
      ),
    ).toBeVisible();
  });

  it('refuses to call completeness unknown a complete page', async () => {
    renderSection([receiptsMock(page({ truncated: null }))]);

    expect(
      await screen.findByText(
        'The server did not say whether this page is complete, so it is not presented as the whole set.',
      ),
    ).toBeVisible();
  });

  it('reports when it asked, not that the page is still current', async () => {
    renderSection([receiptsMock(page())]);

    expect(
      await screen.findByText(
        'Asked at 2026-10-31T08:00:00.000Z. Nothing since then is reflected here.',
      ),
    ).toBeVisible();
  });

  it('says an empty page is not proof that no receipt was received', async () => {
    renderSection([receiptsMock(page({ receipts: [] }))]);

    expect(
      await screen.findByText(/is found by no list read/),
    ).toBeVisible();
  });

  it('names what to configure when the company has no bridging connection', async () => {
    renderSection([
      receiptsMock(
        page({ status: 'NOT_CONFIGURED', receipts: [], cap: 100 }),
      ),
    ]);

    expect(
      await screen.findByText(/Configure an intake connection/),
    ).toBeVisible();
    expect(screen.queryByText(/No receipt is listed/)).not.toBeInTheDocument();
  });

  it('shows a denial as a denial, never as an empty list', async () => {
    renderSection([
      {
        request: { query: HERMES_INBOUND_RECEIPTS },
        // A GraphQL denial, which is what the server's auth filter returns.
        // A bare network error would be 'failed', not 'denied'.
        result: {
          errors: [
            {
              message: 'Forbidden',
              extensions: { code: 'FORBIDDEN' },
            },
          ],
        },
      },
    ]);

    expect(
      await screen.findByText(
        'Your role does not allow reading the bridge receipts.',
      ),
    ).toBeVisible();
    expect(screen.queryByText(/No receipt is listed/)).not.toBeInTheDocument();
  });

  it('shows an unreadable page as unknown, never as no receipt', async () => {
    renderSection([receiptsMock(page({ status: 'SOMETHING_ELSE' }))]);

    expect(await screen.findByText(/Bridge receipts/)).toBeVisible();
    expect(screen.queryByText(/No receipt is listed/)).not.toBeInTheDocument();
  });

  it('fires the classification for the receipt picked, with its canonical identifier', async () => {
    renderSection([
      receiptsMock(page()),
      {
        // The matcher belongs inside request.variables in this version.
        request: {
          query: HERMES_INBOUND_ITEM_CLASSIFICATION,
          variables: {
            provider: 'HEYFORM',
            eventId: 'evt_[2026].a*b',
            bookingUid: null,
          },
        },
        result: {
          data: {
            hermesInboundItemClassification: {
              __typename: 'HermesInboundItemClassification',
              status: 'CLASSIFIED',
              checkedAt: '2026-10-31T08:00:05.000Z',
              contactState: 'LINKED',
              automaticDealCreated: false,
              origin: {
                __typename: 'HermesInboundOrigin',
                source: 'FORMS',
                provider: 'HEYFORM',
                connectionId: 'connection-1',
                structureId: 'company-1',
                eventId: 'evt_[2026].a*b',
                receivedAt: '2026-10-30T12:00:00.000Z',
                attribution: 'VERIFIED',
              },
              links: {
                __typename: 'HermesInboundLinks',
                personId: 'person-1',
                companyId: null,
                noteId: 'note-1',
                calendarEventId: null,
                conversationId: null,
                existingOpportunityIds: ['opportunity-1'],
              },
            },
          },
        },
      },
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Inspect' }));

    // The no-deal statement is read from the server, not assumed by the panel.
    expect(
      await screen.findByText(/No opportunity was created by this reception/),
    ).toBeVisible();
    await waitFor(() =>
      expect(screen.getByText('Linked')).toBeVisible(),
    );
  });

  it('nothing is inspected before the operator picks a receipt', async () => {
    renderSection([receiptsMock(page())]);

    expect(await screen.findByText('evt_[2026].a*b')).toBeVisible();
    expect(
      screen.queryByText(/No opportunity was created by this reception/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Reading the classification…'),
    ).not.toBeInTheDocument();
  });

  it('reports a booking record as unasked rather than absent', async () => {
    renderSection([
      receiptsMock(
        page({
          receipts: [
            { ...RECEIPT, provider: 'CAL_DIY', eventId: 'booking-evt-1' },
          ],
        }),
      ),
      {
        request: {
          query: HERMES_INBOUND_ITEM_CLASSIFICATION,
          variables: {
            provider: 'CAL_DIY',
            eventId: 'booking-evt-1',
            bookingUid: null,
          },
        },
        result: {
          data: {
            hermesInboundItemClassification: {
              __typename: 'HermesInboundItemClassification',
              status: 'CLASSIFIED',
              checkedAt: '2026-10-31T08:00:05.000Z',
              contactState: 'UNLINKED',
              automaticDealCreated: false,
              origin: {
                __typename: 'HermesInboundOrigin',
                source: 'CALENDAR',
                provider: 'CAL_DIY',
                connectionId: 'connection-1',
                structureId: 'company-1',
                eventId: 'booking-evt-1',
                receivedAt: '2026-10-30T12:00:00.000Z',
                attribution: 'VERIFIED',
              },
              links: {
                __typename: 'HermesInboundLinks',
                personId: null,
                companyId: null,
                noteId: 'note-1',
                calendarEventId: null,
                conversationId: null,
                existingOpportunityIds: [],
              },
            },
          },
        },
      },
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Inspect' }));

    expect(
      await screen.findByText(/the receipt does not store the booking/),
    ).toBeVisible();
  });

  it('says a receipt it cannot address is not inspectable', async () => {
    renderSection([
      receiptsMock(
        page({
          receipts: [{ ...RECEIPT, provider: 'TYPEFORM', eventId: null }],
        }),
      ),
    ]);

    await userEvent.click(await screen.findByRole('button', { name: 'Inspect' }));

    expect(
      await screen.findByText(/This receipt cannot be inspected/),
    ).toBeVisible();
  });
});
