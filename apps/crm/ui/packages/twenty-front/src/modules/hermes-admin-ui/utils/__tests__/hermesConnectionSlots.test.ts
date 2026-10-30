import { type HermesConnection } from '@/hermes-admin-ui/types/HermesConnection';
import {
  buildHermesConnectionSlots,
  readHermesConnectionSlotKey,
} from '@/hermes-admin-ui/utils/hermesConnectionSlots';

const connection = (
  overrides: Partial<HermesConnection> & { id: string; companyId: string },
): HermesConnection => ({
  kind: null,
  unknownKind: null,
  label: null,
  protocol: null,
  state: null,
  unknownState: null,
  verifiedAt: null,
  errorCode: null,
  disabledBy: null,
  disabledAt: null,
  hasStoredSecret: null,
  capabilities: [],
  revision: null,
  ...overrides,
});

describe('buildHermesConnectionSlots', () => {
  it('shows every channel, including the ones with nothing registered', () => {
    const slots = buildHermesConnectionSlots(
      [
        connection({
          id: 'c1',
          companyId: 'atelier',
          kind: 'WHATSAPP_EVOLUTION',
        }),
      ],
      'atelier',
    );

    expect(slots).toHaveLength(7);
    expect(slots[0]).toEqual({
      kind: 'registered',
      connection: expect.objectContaining({ id: 'c1' }),
    });
    expect(slots.slice(1).every((slot) => slot.kind === 'unregistered')).toBe(
      true,
    );
  });

  it('shows several connections of the same channel rather than one', () => {
    const slots = buildHermesConnectionSlots(
      [
        connection({ id: 'c1', companyId: 'atelier', kind: 'EMAIL_IMAP' }),
        connection({ id: 'c2', companyId: 'atelier', kind: 'EMAIL_IMAP' }),
      ],
      'atelier',
    );

    expect(
      slots.filter(
        (slot) => slot.kind === 'registered' && slot.connection.id !== '',
      ),
    ).toHaveLength(2);
  });

  it('never puts another company’s connection in the list', () => {
    const slots = buildHermesConnectionSlots(
      [connection({ id: 'c1', companyId: 'verdure', kind: 'MCP' })],
      'atelier',
    );

    expect(slots.every((slot) => slot.kind === 'unregistered')).toBe(true);
  });

  it('shows nothing at all when no company is active', () => {
    expect(
      buildHermesConnectionSlots(
        [connection({ id: 'c1', companyId: 'atelier', kind: 'MCP' })],
        null,
      ),
    ).toEqual([]);
  });

  it('keeps a connection whose kind it does not recognise, last', () => {
    const slots = buildHermesConnectionSlots(
      [
        connection({
          id: 'c9',
          companyId: 'atelier',
          kind: null,
          unknownKind: 'CARRIER_PIGEON',
        }),
      ],
      'atelier',
    );

    expect(slots).toHaveLength(8);
    expect(slots[7]).toEqual({
      kind: 'registered',
      connection: expect.objectContaining({ id: 'c9' }),
    });
  });
});

describe('readHermesConnectionSlotKey', () => {
  it('keys an unregistered channel by the channel it stands for', () => {
    expect(
      readHermesConnectionSlotKey({
        kind: 'unregistered',
        connectionKind: 'FORMS',
      }),
    ).toBe('unregistered:FORMS');
  });

  it('keys a registered connection by its id', () => {
    expect(
      readHermesConnectionSlotKey({
        kind: 'registered',
        connection: connection({ id: 'c1', companyId: 'atelier' }),
      }),
    ).toBe('connection:c1');
  });
});
