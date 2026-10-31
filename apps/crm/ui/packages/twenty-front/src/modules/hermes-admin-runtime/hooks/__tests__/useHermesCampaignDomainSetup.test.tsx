import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import { HERMES_CREATE_EMAILING_DOMAIN } from '@/hermes-admin-runtime/graphql/metadata-mutations/hermesCreateEmailingDomain';
import { useHermesCampaignDomainSetup } from '@/hermes-admin-runtime/hooks/useHermesCampaignDomainSetup';

const DOMAIN = 'atelier.example';

// The write is counted rather than merely matched: the defect this file covers
// is a SECOND write, so the number of requests is the assertion.
const buildCreateMock = (
  spy: jest.Mock,
  outcome: { answersWithRecord: boolean },
): MockedResponse => ({
  request: {
    query: HERMES_CREATE_EMAILING_DOMAIN,
    variables: (variables) => {
      spy(variables);

      return true;
    },
  },
  maxUsageCount: 10,
  result: {
    data: {
      createEmailingDomain: outcome.answersWithRecord
        ? {
            __typename: 'EmailingDomain',
            id: 'domain-1',
            domain: DOMAIN,
            status: 'PENDING',
            unsubscribeHostnameStatus: 'PENDING',
            verifiedAt: null,
            verificationRecords: [],
            createdAt: '2026-10-31T09:00:00.000Z',
            updatedAt: '2026-10-31T09:00:00.000Z',
          }
        : null,
    },
  },
});

const renderSetup = (
  mocks: MockedResponse[],
  refetchDomains: () => Promise<unknown>,
) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks}>{children}</MockedProvider>
  );

  return renderHook(() => useHermesCampaignDomainSetup({ refetchDomains }), {
    wrapper,
  });
};

describe('useHermesCampaignDomainSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses a second write while the first outcome is unreadable', async () => {
    const spy = jest.fn();
    const refetchDomains = jest.fn(() => Promise.resolve());
    const { result } = renderSetup(
      [buildCreateMock(spy, { answersWithRecord: false })],
      refetchDomains,
    );

    expect(result.current.canRecord).toBe(true);

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    expect(result.current.outcome).toEqual({
      kind: 'unconfirmed',
      listReread: false,
    });

    // The guard is in the hook, not only on the button: a second attempt from
    // anywhere must not reach the server while the record may already exist.
    expect(result.current.canRecord).toBe(false);

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('re-opens the write only after the re-read succeeded', async () => {
    const spy = jest.fn();
    const refetchDomains = jest.fn(() => Promise.resolve());
    const { result } = renderSetup(
      [buildCreateMock(spy, { answersWithRecord: false })],
      refetchDomains,
    );

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });
    expect(result.current.canRecord).toBe(false);

    await act(async () => {
      await result.current.retryDomainsRead();
    });

    expect(refetchDomains).toHaveBeenCalledTimes(1);
    expect(result.current.outcome).toEqual({
      kind: 'unconfirmed',
      listReread: true,
    });

    // The domain list is the authority that would hold the record, and it was
    // read again, so the operator may try once more.
    expect(result.current.canRecord).toBe(true);

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('keeps the write closed when the re-read itself failed', async () => {
    const spy = jest.fn();
    const refetchDomains = jest.fn(() => Promise.reject(new Error('offline')));
    const { result } = renderSetup(
      [buildCreateMock(spy, { answersWithRecord: false })],
      refetchDomains,
    );

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    await act(async () => {
      await result.current.retryDomainsRead();
    });

    expect(result.current.outcome).toEqual({
      kind: 'unconfirmed',
      listReread: false,
    });

    // Nothing was settled, so nothing is re-opened.
    expect(result.current.canRecord).toBe(false);
  });

  it('never re-opens the write once the server accepted it', async () => {
    const spy = jest.fn();
    const refetchDomains = jest.fn(() => Promise.resolve());
    const { result } = renderSetup(
      [buildCreateMock(spy, { answersWithRecord: true })],
      refetchDomains,
    );

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    await waitFor(() => {
      expect(result.current.outcome).toEqual({
        kind: 'recorded-unverified',
        domain: DOMAIN,
      });
    });

    // The record exists server side. A re-read is the only move, however many
    // times it is run, and it never re-authorises a create.
    expect(result.current.canRecord).toBe(false);

    await act(async () => {
      await result.current.retryDomainsRead();
    });

    expect(refetchDomains).toHaveBeenCalledTimes(2);
    expect(result.current.canRecord).toBe(false);

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('never re-opens the write when an accepted record could not be re-read', async () => {
    // 'recorded-not-reread' had no direct coverage, so the predicate's answer
    // for it rested on reading alone. The write was ACCEPTED and only the list
    // read failed: the record exists, and a second attempt would duplicate the
    // one domain this panel can create.
    const spy = jest.fn();
    const refetchDomains = jest.fn(() => Promise.reject(new Error('offline')));
    const { result } = renderSetup(
      [buildCreateMock(spy, { answersWithRecord: true })],
      refetchDomains,
    );

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    expect(result.current.outcome).toEqual({
      kind: 'recorded-not-reread',
      domain: DOMAIN,
    });
    expect(result.current.canRecord).toBe(false);

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    expect(spy).toHaveBeenCalledTimes(1);

    // The re-read passes through 'rereading' and lands back here when it fails
    // again. Neither state re-authorises the write.
    await act(async () => {
      await result.current.retryDomainsRead();
    });

    expect(result.current.outcome).toEqual({
      kind: 'recorded-not-reread',
      domain: DOMAIN,
    });
    expect(result.current.canRecord).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('re-opens the write after a lost answer whose re-read succeeded', async () => {
    // The 'write-unknown' half of the listReread rule, which only the panel
    // exercised indirectly.
    const spy = jest.fn();
    const refetchDomains = jest.fn(() => Promise.resolve());
    const { result } = renderSetup(
      [
        {
          request: {
            query: HERMES_CREATE_EMAILING_DOMAIN,
            variables: (variables) => {
              spy(variables);

              return true;
            },
          },
          maxUsageCount: 10,
          error: new Error('socket hang up'),
        },
      ],
      refetchDomains,
    );

    await act(async () => {
      await result.current.recordDomain(DOMAIN);
    });

    expect(result.current.outcome.kind).toBe('write-unknown');
    expect(result.current.canRecord).toBe(false);

    await act(async () => {
      await result.current.retryDomainsRead();
    });

    expect(result.current.canRecord).toBe(true);
  });
});
