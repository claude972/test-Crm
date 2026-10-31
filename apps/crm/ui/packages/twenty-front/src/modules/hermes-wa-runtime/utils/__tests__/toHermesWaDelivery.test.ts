import { readMessagingInboxMessageStatus } from '@/messaging-inbox/types/MessagingInboxMessageStatus';

import {
  toHermesWaDelivery,
  toHermesWaDeliveryState,
} from '@/hermes-wa-runtime/utils/toHermesWaDelivery';

describe('toHermesWaDeliveryState', () => {
  it.each(['RECEIVED', 'ACCEPTED', 'UNCONFIRMED', 'FAILED'] as const)(
    'carries the recognised status %s across by name',
    (status) => {
      expect(
        toHermesWaDeliveryState(readMessagingInboxMessageStatus(status)),
      ).toEqual({ kind: 'known', state: status });
    },
  );

  // The defect this bridge exists for. The inbox reader matches the four names
  // exactly; the library's string reader uppercases first. Reading the raw
  // value a second time therefore turned a status the inbox had REJECTED into
  // a recognised one, and the bubble rendered "Received" for it.
  it('keeps a status the inbox rejected unknown instead of recognising it on a second read', () => {
    const rejected = readMessagingInboxMessageStatus('received');

    expect(rejected).toEqual({ kind: 'unknown', raw: 'received' });

    expect(toHermesWaDeliveryState(rejected)).toEqual({
      kind: 'unknown',
      raw: 'received',
    });
  });

  it.each(['DELIVERED', 'read', 'PENDING_WHATEVER'])(
    'leaves the unrecognised status %s unknown and keeps the server word',
    (raw) => {
      expect(
        toHermesWaDeliveryState(readMessagingInboxMessageStatus(raw)),
      ).toEqual({ kind: 'unknown', raw });
    },
  );

  // DELIVERED is the one that matters most: a provider word this product
  // deliberately does not publish must never become a settled success.
  it('never turns an unpublished DELIVERED into a known state', () => {
    const verdict = toHermesWaDeliveryState(
      readMessagingInboxMessageStatus('DELIVERED'),
    );

    expect(verdict.kind).toBe('unknown');
    expect(verdict).not.toMatchObject({ kind: 'known' });
  });

  it.each([null, undefined, 42, {}, []])(
    'reports no state at all for the non-string %p',
    (value) => {
      expect(
        toHermesWaDeliveryState(readMessagingInboxMessageStatus(value)),
      ).toEqual({ kind: 'unknown', raw: null });
    },
  );
});

describe('toHermesWaDelivery', () => {
  it('passes the error code through untouched beside the state', () => {
    expect(
      toHermesWaDelivery(
        readMessagingInboxMessageStatus('FAILED'),
        'SEND_REJECTED',
      ),
    ).toEqual({
      state: { kind: 'known', state: 'FAILED' },
      errorCode: 'SEND_REJECTED',
    });
  });

  it('carries an absent error code as null without inventing one', () => {
    expect(
      toHermesWaDelivery(readMessagingInboxMessageStatus('ACCEPTED'), null),
    ).toEqual({
      state: { kind: 'known', state: 'ACCEPTED' },
      errorCode: null,
    });
  });
});
