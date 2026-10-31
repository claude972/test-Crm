import { type MessagingInboxConnection } from '@/messaging-inbox/types/MessagingInboxConnection';

import { toHermesWaCapability } from '@/hermes-wa-runtime/utils/toHermesWaCapability';

// A connection with every capability closed, which is what the server publishes
// for a provider nobody has configured.
const closed: MessagingInboxConnection = {
  channel: 'WHATSAPP',
  unknownChannel: null,
  state: 'AVAILABLE',
  unknownState: null,
  canSend: true,
  canSync: false,
  canSendMedia: false,
  canReceiveMedia: false,
  canRecordVoice: false,
  canComposeRichEmail: false,
  lastCheckedAt: null,
  errorCode: null,
};

describe('Reading one WhatsApp capability from a connection', () => {
  it('reads each media capability from its own flag and never from another', () => {
    const read = {
      kind: 'reported' as const,
      connection: { ...closed, canReceiveMedia: true },
    };

    expect(toHermesWaCapability(read, 'canReceiveMedia')).toEqual({
      kind: 'available',
    });
    // Receiving says nothing about sending or recording.
    expect(toHermesWaCapability(read, 'canSendMedia').kind).toBe('unavailable');
    expect(toHermesWaCapability(read, 'canRecordVoice').kind).toBe(
      'unavailable',
    );
  });

  it('does not open reception because the connection is otherwise healthy', () => {
    expect(
      toHermesWaCapability(
        { kind: 'reported', connection: { ...closed, canSend: true } },
        'canReceiveMedia',
      ),
    ).toEqual({ kind: 'unavailable', reason: null });
  });

  it('keeps a failed read apart from a provider nobody configured', () => {
    expect(toHermesWaCapability({ kind: 'unknown' }, 'canReceiveMedia')).toEqual(
      { kind: 'unavailable', reason: null },
    );
    expect(toHermesWaCapability({ kind: 'loading' }, 'canReceiveMedia')).toEqual(
      { kind: 'unavailable', reason: null },
    );
    expect(toHermesWaCapability({ kind: 'absent' }, 'canReceiveMedia')).toEqual({
      kind: 'notConfigured',
    });
  });

  it('carries the server diagnostic as a reason without turning it into an outcome', () => {
    expect(
      toHermesWaCapability(
        {
          kind: 'reported',
          connection: { ...closed, errorCode: 'PROVIDER_UNAVAILABLE' },
        },
        'canRecordVoice',
      ),
    ).toEqual({ kind: 'unavailable', reason: 'PROVIDER_UNAVAILABLE' });
  });

  it('opens each capability only on an explicit true', () => {
    for (const name of ['canSendMedia', 'canReceiveMedia', 'canRecordVoice'] as const)
      expect(
        toHermesWaCapability(
          { kind: 'reported', connection: { ...closed, [name]: true } },
          name,
        ),
      ).toEqual({ kind: 'available' });
  });
});
