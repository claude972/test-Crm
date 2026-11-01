import { ApolloLink, InMemoryCache, type Operation } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type PropsWithChildren } from 'react';

import {
  HERMES_WHATSAPP_ENROLLMENT_QR,
  HERMES_WHATSAPP_ENROLLMENT_START,
  HERMES_WHATSAPP_ENROLLMENT_STATUS,
} from '@/hermes-whatsapp-setup/graphql/hermesWhatsappEnrollment';
import { useHermesWhatsappEnrollment } from '@/hermes-whatsapp-setup/hooks/useHermesWhatsappEnrollment';

const session = {};
const scope = {
  workspaceId: 'workspace-a',
  sessionIdentity: session,
  expectedRevision: 0,
};
const base = {
  state: 'NOT_CONFIGURED',
  revision: 0,
  providerState: null,
  ingressEnabled: false,
  cutoffAt: null,
  botMode: 'OFF',
  reasonCode: null,
};
const pendingView = {
  ...base,
  state: 'AWAITING_PAIRING',
  revision: 1,
  providerState: 'connecting',
};
const qr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const status = (value: unknown, revision = 0, delay = 0): MockedResponse => ({
  request: {
    query: HERMES_WHATSAPP_ENROLLMENT_STATUS,
    variables: { input: { expectedRevision: revision } },
  },
  delay,
  result: { data: { hermesWhatsappEnrollmentStatus: value } },
});

const harness = (mocks: MockedResponse[]) => {
  const operations: Operation[] = [];
  const cache = new InMemoryCache();
  const link = ApolloLink.from([
    new ApolloLink((operation, forward) => {
      operations.push(operation);
      return forward(operation);
    }),
    new MockLink(mocks),
  ]);
  const wrapper = ({ children }: PropsWithChildren) => (
    <MockedProvider link={link} cache={cache}>
      {children}
    </MockedProvider>
  );
  return { wrapper, operations, cache };
};

describe('useHermesWhatsappEnrollment', () => {
  it('only reads on mount and never caches the enrollment response', async () => {
    const { wrapper, operations, cache } = harness([status(base)]);
    const { result } = renderHook(() => useHermesWhatsappEnrollment(scope), {
      wrapper,
    });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(operations.map((operation) => operation.operationName)).toEqual([
      'HermesWhatsappEnrollmentStatus',
    ]);
    expect(operations[0].getContext().skipRetry).toBe(true);
    expect(cache.extract()).toEqual({});
  });

  it('takes one write lock and recovers an uncertain start through Status only', async () => {
    const { wrapper, operations } = harness([
      status(base),
      {
        request: {
          query: HERMES_WHATSAPP_ENROLLMENT_START,
          variables: { input: { expectedRevision: 0 } },
        },
        delay: 30,
        error: new Error('lost answer'),
      },
      status(pendingView),
    ]);
    const { result } = renderHook(() => useHermesWhatsappEnrollment(scope), {
      wrapper,
    });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(async () => {
      void result.current.request('Start');
      void result.current.request('Start');
    });
    await waitFor(() => expect(result.current.phase).toBe('unknown'));
    await act(async () => {
      await result.current.request('Start');
    });
    expect(
      operations.filter(
        (operation) =>
          operation.operationName === 'HermesWhatsappEnrollmentStart',
      ),
    ).toHaveLength(1);
    await act(async () => {
      await result.current.request('Status');
    });
    expect(result.current.read?.view.revision).toBe(1);
  });

  it.each(['workspace', 'session', 'revision'] as const)(
    'drops a late QR and clears phone and errors when %s changes',
    async (change) => {
      const { wrapper, cache } = harness([
        status(pendingView),
        {
          request: {
            query: HERMES_WHATSAPP_ENROLLMENT_QR,
            variables: { input: { expectedRevision: 1 } },
          },
          delay: 80,
          result: {
            data: {
              hermesWhatsappEnrollmentQr: {
                ...pendingView,
                qrDataUrl: qr,
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
              },
            },
          },
        },
        status(base, change === 'revision' ? 3 : 0),
      ]);
      const { result, rerender } = renderHook(
        (props) => useHermesWhatsappEnrollment(props),
        { wrapper, initialProps: scope },
      );
      await waitFor(() => expect(result.current.phase).toBe('ready'));
      act(() => result.current.setPhoneNumber('+33612345678'));
      act(() => {
        void result.current.request('Qr');
      });
      rerender({
        ...scope,
        ...(change === 'workspace'
          ? { workspaceId: 'workspace-b' }
          : change === 'session'
            ? { sessionIdentity: {} }
            : { expectedRevision: 3 }),
      });
      expect(result.current.phoneNumber).toBe('');
      expect(result.current.read?.credential ?? null).toBeNull();
      await waitFor(() => expect(result.current.phase).toBe('ready'));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 120));
      });
      expect(result.current.read?.view.state).toBe('NOT_CONFIGURED');
      expect(result.current.read?.credential).toBeNull();
      expect(JSON.stringify(cache.extract())).not.toContain(qr);
    },
  );

  it('clears a QR when its display lease ends', async () => {
    jest.useFakeTimers();
    const displayUntil = Date.now() + 60_000;
    const { wrapper } = harness([
      status(pendingView),
      {
        request: {
          query: HERMES_WHATSAPP_ENROLLMENT_QR,
          variables: { input: { expectedRevision: 1 } },
        },
        delay: 0,
        result: {
          data: {
            hermesWhatsappEnrollmentQr: {
              ...pendingView,
              qrDataUrl: qr,
              pairingCode: 'ABCD-EFGH',
              expiresAt: new Date(displayUntil).toISOString(),
            },
          },
        },
      },
    ]);
    const { result, unmount } = renderHook(
      () => useHermesWhatsappEnrollment(scope),
      { wrapper },
    );
    try {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(result.current.phase).toBe('ready');
      await act(async () => {
        const request = result.current.request('Qr');
        await jest.advanceTimersByTimeAsync(1);
        await request;
      });
      expect(result.current.read?.credential?.pairingCode).toBe('ABCD-EFGH');
      await act(async () => {
        await jest.advanceTimersByTimeAsync(60_000);
      });
      expect(result.current.read?.credential).toBeNull();
    } finally {
      unmount();
      jest.useRealTimers();
    }
  });
  it.each([
    {
      code: 'UNAUTHENTICATED',
      subCode: 'SESSION_SUPERSEDED',
      message: 'SESSION_SUPERSEDED',
      phase: 'stale',
    },
    {
      code: 'BAD_USER_INPUT',
      subCode: undefined,
      message: 'WA_BOT_MUST_BE_OFF',
      phase: 'refused',
    },
  ])(
    'keeps native $phase distinct from an uncertain provider write',
    async ({ code, subCode, message, phase }) => {
      const { wrapper } = harness([
        {
          request: {
            query: HERMES_WHATSAPP_ENROLLMENT_STATUS,
            variables: { input: { expectedRevision: 0 } },
          },
          delay: 0,
          result: {
            errors: [
              {
                message,
                extensions: { code, ...(subCode ? { subCode } : {}) },
              },
            ],
          },
        },
      ]);
      const { result } = renderHook(() => useHermesWhatsappEnrollment(scope), {
        wrapper,
      });
      await waitFor(() => expect(result.current.phase).toBe(phase));
      expect(result.current.read?.credential ?? null).toBeNull();
    },
  );
});
