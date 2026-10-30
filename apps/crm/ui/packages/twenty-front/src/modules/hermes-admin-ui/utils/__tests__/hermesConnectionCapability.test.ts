import {
  type HermesConnection,
  type HermesConnectionCapabilityReport,
} from '@/hermes-admin-ui/types/HermesConnection';
import {
  filterHermesConnectionsByCompany,
  isHermesCapabilityUsable,
  readHermesUnexpectedCapabilityNames,
  resolveHermesConnectionCapabilities,
  resolveHermesConnectionCapability,
} from '@/hermes-admin-ui/utils/hermesConnectionCapability';
import { type HermesConnectionStateDescriptor } from '@/hermes-admin-ui/utils/hermesConnectionState';

const verified: HermesConnectionStateDescriptor = {
  kind: 'VERIFIED',
  verifiedAt: new Date('2026-10-30T09:40:00.000Z'),
};

const configured: HermesConnectionStateDescriptor = {
  kind: 'CONFIGURED_UNVERIFIED',
};

const granted = (granted: boolean | null): HermesConnectionCapabilityReport => ({
  capability: 'SEND_MEDIA',
  unknownCapability: null,
  granted,
});

describe('resolveHermesConnectionCapability', () => {
  it('treats a capability nobody reported as not confirmed, never as available', () => {
    expect(resolveHermesConnectionCapability(verified, undefined)).toBe(
      'unconfirmed',
    );
  });

  it('treats a capability reported without an answer as not confirmed', () => {
    expect(resolveHermesConnectionCapability(verified, granted(null))).toBe(
      'unconfirmed',
    );
  });

  it('does not grant a capability on a connection that was never verified', () => {
    expect(resolveHermesConnectionCapability(configured, granted(true))).toBe(
      'unconfirmed',
    );
  });

  it('grants only what a dated verification backs', () => {
    expect(resolveHermesConnectionCapability(verified, granted(true))).toBe(
      'available',
    );
  });

  it('reports a refused capability as unavailable rather than unconfirmed', () => {
    expect(resolveHermesConnectionCapability(verified, granted(false))).toBe(
      'unavailable',
    );
  });

  it('makes everything unavailable when nothing is configured, it fails, or an administrator disabled it', () => {
    expect(
      resolveHermesConnectionCapability({ kind: 'NOT_CONFIGURED' }, granted(true)),
    ).toBe('unavailable');
    expect(
      resolveHermesConnectionCapability(
        { kind: 'ERROR', errorCode: null },
        granted(true),
      ),
    ).toBe('unavailable');
    expect(
      resolveHermesConnectionCapability(
        { kind: 'DISABLED', disabledBy: null, disabledAt: null },
        granted(true),
      ),
    ).toBe('unavailable');
  });

  it('says nothing about a capability when the state itself could not be read', () => {
    expect(
      resolveHermesConnectionCapability(
        { kind: 'UNKNOWN', reported: null },
        granted(true),
      ),
    ).toBe('unconfirmed');
  });
});

describe('isHermesCapabilityUsable', () => {
  it('lets nothing through but an available capability', () => {
    expect(isHermesCapabilityUsable('available')).toBe(true);
    expect(isHermesCapabilityUsable('unavailable')).toBe(false);
    expect(isHermesCapabilityUsable('unconfirmed')).toBe(false);
  });
});

describe('resolveHermesConnectionCapabilities', () => {
  it('still names a capability the server left out entirely', () => {
    const resolved = resolveHermesConnectionCapabilities(
      'WHATSAPP_EVOLUTION',
      verified,
      [
        {
          capability: 'RECEIVE',
          unknownCapability: null,
          granted: true,
        },
      ],
    );

    expect(resolved).toEqual([
      { capability: 'RECEIVE', availability: 'available' },
      { capability: 'SEND', availability: 'unconfirmed' },
      { capability: 'RECEIVE_MEDIA', availability: 'unconfirmed' },
      { capability: 'SEND_MEDIA', availability: 'unconfirmed' },
      { capability: 'VOICE', availability: 'unconfirmed' },
    ]);
  });

  it('asks about nothing for a kind it does not know', () => {
    expect(resolveHermesConnectionCapabilities(null, verified, [])).toEqual([]);
  });
});

describe('readHermesUnexpectedCapabilityNames', () => {
  it('keeps a capability the screen cannot place instead of dropping it', () => {
    expect(
      readHermesUnexpectedCapabilityNames('APPOINTMENTS', [
        { capability: 'BOOKING', unknownCapability: null, granted: true },
        { capability: 'VOICE', unknownCapability: null, granted: true },
        { capability: null, unknownCapability: 'TELEPATHY', granted: true },
        { capability: null, unknownCapability: null, granted: true },
      ]),
    ).toEqual(['VOICE', 'TELEPATHY']);
  });
});

const connection = (
  id: string,
  companyId: string,
): Pick<HermesConnection, 'id' | 'companyId'> => ({ id, companyId });

describe('filterHermesConnectionsByCompany', () => {
  const connections = [
    connection('c1', 'atelier'),
    connection('c2', 'verdure'),
    connection('c3', 'atelier'),
  ] as HermesConnection[];

  it('keeps one company out of another company’s list', () => {
    expect(
      filterHermesConnectionsByCompany(connections, 'atelier').map((c) => c.id),
    ).toEqual(['c1', 'c3']);
  });

  it('shows nothing rather than everything when no company is active', () => {
    expect(filterHermesConnectionsByCompany(connections, null)).toEqual([]);
  });
});
