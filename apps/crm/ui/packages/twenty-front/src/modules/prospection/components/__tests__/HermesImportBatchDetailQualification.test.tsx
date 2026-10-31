import { ApolloLink, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';

import { HERMES_QUALIFY_IMPORT_ROWS } from '@/prospection/graphql/metadata-mutations/hermesQualifyImportRows';
import { HERMES_SCRAPING_CLASSIFICATION } from '@/prospection/graphql/metadata-queries/hermesScrapingClassification';
import { HermesImportBatchDetail } from '@/prospection/components/HermesImportBatchDetail';
import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';

// @base-ui/react radios dispatch PointerEvent, which jsdom does not define.
// Aliasing it to MouseEvent is enough for the two choices to be pickable.
if (typeof (globalThis as { PointerEvent?: unknown }).PointerEvent !== 'function') {
  Object.assign(globalThis, { PointerEvent: MouseEvent });
}

// The campaign feature flag is not what this journey is about, and the draft
// form must not reach for an operation nobody mocked here.
jest.mock('@/workspace/hooks/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: () => false,
}));

const BATCH_ID = 'batch-1';
const ROW_ID = 'row-1';

const batch: HermesImportBatch = {
  id: BATCH_ID,
  externalBatchId: 'external-1',
  fingerprint: null,
  name: 'Collecte Dupont',
  sourceUrl: null,
  collectedAt: '2026-10-30T12:00:00.000Z',
  createdAt: '2026-10-30T12:00:00.000Z',
  createdByUserId: null,
  originKind: 'SIGNED_INTAKE',
  originConnectionId: 'connection-1',
  originReceivedAt: '2026-10-30T12:00:00.000Z',
  rows: [
    {
      id: ROW_ID,
      status: 'pending',
      unknownStatus: null,
      errors: [],
      email: 'contact@atelier.example',
      companyName: 'Atelier Dupont',
      firstName: 'Claire',
      lastName: 'Dupont',
      jobTitle: null,
      website: null,
      phone: null,
      personId: null,
      companyId: null,
      hasQualification: false,
    },
  ],
  areRowsReadable: true,
  unreadableRowCount: 0,
};

const classificationPayload = (linkedPersonIds: string[]) => ({
  __typename: 'HermesScrapingClassification',
  checkedAt: '2026-10-31T09:44:00.000Z',
  structureId: 'company-1',
  automaticDealCreated: false,
  batches: [
    {
      __typename: 'HermesScrapingBatchClassification',
      batchId: BATCH_ID,
      externalBatchId: 'external-1',
      qualificationRequired: true,
      linkedPersonIds,
      linkedCompanyIds: [],
      origin: {
        __typename: 'HermesInboundOrigin',
        source: 'SCRAPING',
        provider: null,
        connectionId: 'connection-1',
        structureId: 'company-1',
        eventId: 'external-1',
        receivedAt: '2026-10-30T12:00:00.000Z',
        attribution: 'VERIFIED',
      },
      counts: {
        __typename: 'HermesScrapingRowCounts',
        total: 1,
        pending: 0,
        invalid: 0,
        duplicate: 0,
        suppressed: 0,
        conflict: 0,
        qualified: 1,
      },
    },
  ],
});

const classificationMock = (linkedPersonIds: string[]): MockedResponse => ({
  request: { query: HERMES_SCRAPING_CLASSIFICATION },
  result: {
    data: { hermesScrapingClassification: classificationPayload(linkedPersonIds) },
  },
});

const qualifyInput = {
  batchId: BATCH_ID,
  rowIds: [ROW_ID],
  professionalPurpose: 'Prospection B2B des ateliers du secteur',
  privacyNoticeUrl: 'https://example.org/privacy',
  informationMethod: 'already-informed',
};

// The matcher belongs inside request.variables in this version of the harness.
const qualifyMock = (result: MockedResponse['result']): MockedResponse => ({
  request: {
    query: HERMES_QUALIFY_IMPORT_ROWS,
    variables: { input: qualifyInput },
  },
  result,
});

const readableQualifyMock = qualifyMock({
  data: {
    hermesQualifyImportRows: {
      rows: [{ id: ROW_ID, status: 'qualified', errors: [] }],
    },
  },
});

const renderDetail = (mocks: MockedResponse[]) => {
  // Every operation is recorded on its way to the mock link, which is how
  // "the classification was read again" becomes an assertion, not a claim.
  const operations: Operation[] = [];
  const recordingLink = new ApolloLink((operation, forward) => {
    operations.push(operation);

    return forward(operation);
  });
  const link = ApolloLink.from([recordingLink, new MockLink(mocks)]);
  const onReload = jest.fn();

  render(
    <Provider store={createStore()}>
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <MockedProvider link={link}>
            <HermesImportBatchDetail
              batch={batch}
              capabilities={{
                smtpCampaignSending: null,
                trackingDefault: null,
                nativeCampaignDrafts: null,
              }}
              onReload={onReload}
            />
          </MockedProvider>
        </MemoryRouter>
      </I18nProvider>
    </Provider>,
  );

  return {
    onReload,
    classificationReads: () =>
      operations.filter(
        (operation) => operation.operationName === 'HermesScrapingClassification',
      ).length,
  };
};

// The dd that sits next to the "Contacts linked by qualification" dt. Several
// other facts in this panel are also zero, so the count is read from its own
// cell rather than from the first '0' on screen.
const linkedContactsCell = () =>
  screen.getByText('Contacts linked by qualification').nextElementSibling;

const submitQualification = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Select all' }));
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Professional purpose' }),
    qualifyInput.professionalPurpose,
  );
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Privacy notice URL' }),
    qualifyInput.privacyNoticeUrl,
  );
  await userEvent.click(
    screen.getByRole('radio', { name: 'Contacts already informed' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Qualify' }));
};

describe('HermesImportBatchDetail — rereading the classification after a qualification', () => {
  it('rereads the classification after a confirmed qualification and shows the new count', async () => {
    // The defect: the first read reports no linked contact, the qualification
    // succeeds, and without a reread the panel keeps showing the first answer.
    const harness = renderDetail([
      classificationMock([]),
      readableQualifyMock,
      classificationMock(['person-1']),
    ]);

    await waitFor(() => expect(harness.classificationReads()).toBe(1));
    // Before: the first classification reports no linked contact.
    await waitFor(() => expect(linkedContactsCell()).toHaveTextContent('0'));

    await submitQualification();

    // Read a second time, and the new count is on screen.
    await waitFor(() => expect(harness.classificationReads()).toBe(2));
    expect(await screen.findByText('1 rows answered.')).toBeVisible();
    await waitFor(() => expect(linkedContactsCell()).toHaveTextContent('1'));
    expect(harness.onReload).toHaveBeenCalledTimes(1);
  });

  it('does not reread on a refused qualification, and says nothing was reread', async () => {
    const harness = renderDetail([
      classificationMock([]),
      {
        request: {
          query: HERMES_QUALIFY_IMPORT_ROWS,
          variables: { input: qualifyInput },
        },
        // A rejected request: MockLink needs `error`, not a throw.
        error: new Error('Qualification refused'),
      },
    ]);

    await waitFor(() => expect(harness.classificationReads()).toBe(1));

    await submitQualification();

    expect(
      await screen.findByText(
        'The counts and the classification below were not reread: this call did not confirm what it changed. What they show is from before this attempt.',
      ),
    ).toBeVisible();
    // An unknown outcome must not trigger a read whose figure would then read
    // as this call's answer.
    expect(harness.classificationReads()).toBe(1);
    expect(harness.onReload).not.toHaveBeenCalled();
  });

  it('does not reread on an unreadable qualification answer', async () => {
    const harness = renderDetail([
      classificationMock([]),
      qualifyMock({ data: { hermesQualifyImportRows: 'not-an-object' } }),
    ]);

    await waitFor(() => expect(harness.classificationReads()).toBe(1));

    await submitQualification();

    expect(
      await screen.findByText(/were not reread/),
    ).toBeVisible();
    expect(harness.classificationReads()).toBe(1);
    expect(harness.onReload).not.toHaveBeenCalled();
  });

  it('never renders a bare zero after a confirmed qualification', async () => {
    // The reread legitimately comes back with nothing linked. That is a
    // disagreement between two server reads, not a count of zero.
    const harness = renderDetail([
      classificationMock([]),
      readableQualifyMock,
      classificationMock([]),
    ]);

    await waitFor(() => expect(harness.classificationReads()).toBe(1));

    await submitQualification();

    await waitFor(() => expect(harness.classificationReads()).toBe(2));
    expect(
      await screen.findByText('None reported, after a confirmed qualification'),
    ).toBeVisible();
    expect(
      screen.getByText(/The two server reads\s+disagree/),
    ).toBeVisible();
  });

  it('shows no such disagreement before any qualification', async () => {
    renderDetail([classificationMock([])]);

    expect(
      await screen.findByText('Contacts linked by qualification'),
    ).toBeVisible();
    // A zero before any qualification is just a count.
    expect(
      screen.queryByText('None reported, after a confirmed qualification'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/The two server reads\s+disagree/),
    ).not.toBeInTheDocument();
  });
});
