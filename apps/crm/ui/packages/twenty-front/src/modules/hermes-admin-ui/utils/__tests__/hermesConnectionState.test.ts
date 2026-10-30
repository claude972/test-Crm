import { type HermesConnection } from '@/hermes-admin-ui/types/HermesConnection';
import {
  formatHermesConnectionStateLabel,
  isHermesConnectionEditable,
  isHermesConnectionTestable,
  readHermesConnectionStateDescriptor,
  type HermesConnectionStateLabels,
} from '@/hermes-admin-ui/utils/hermesConnectionState';

type StateInput = Pick<
  HermesConnection,
  | 'state'
  | 'unknownState'
  | 'verifiedAt'
  | 'errorCode'
  | 'disabledBy'
  | 'disabledAt'
>;

const input = (overrides: Partial<StateInput>): StateInput => ({
  state: null,
  unknownState: null,
  verifiedAt: null,
  errorCode: null,
  disabledBy: null,
  disabledAt: null,
  ...overrides,
});

// The exact five labels of the contract, as the component supplies them.
const labels: HermesConnectionStateLabels = {
  notConfigured: 'Non configuré',
  configuredUnverified: 'Configuré, à vérifier',
  verifiedAt: (formattedDate) => `Connecté, vérifié le ${formattedDate}`,
  error: 'Connexion en erreur',
  disabled: 'Connexion désactivée',
  unknown: 'État de connexion inconnu',
};

const formatDate = () => '30 oct. 2026 à 09:40';

const labelOf = (overrides: Partial<StateInput>): string =>
  formatHermesConnectionStateLabel(
    readHermesConnectionStateDescriptor(input(overrides)),
    labels,
    formatDate,
  );

describe('readHermesConnectionStateDescriptor', () => {
  it('keeps a state it does not know instead of mapping it onto one of the five', () => {
    expect(
      readHermesConnectionStateDescriptor(
        input({ state: null, unknownState: 'PENDING_HANDSHAKE' }),
      ),
    ).toEqual({ kind: 'UNKNOWN', reported: 'PENDING_HANDSHAKE' });
  });

  it('reports an absent state as unknown, not as not configured', () => {
    expect(
      readHermesConnectionStateDescriptor(input({ state: null })),
    ).toEqual({ kind: 'UNKNOWN', reported: null });
  });

  it('does not present a verification without a date as connected', () => {
    expect(
      readHermesConnectionStateDescriptor(
        input({ state: 'VERIFIED', verifiedAt: null }),
      ),
    ).toEqual({ kind: 'CONFIGURED_UNVERIFIED' });

    expect(
      readHermesConnectionStateDescriptor(
        input({ state: 'VERIFIED', verifiedAt: '   ' }),
      ),
    ).toEqual({ kind: 'CONFIGURED_UNVERIFIED' });

    expect(
      readHermesConnectionStateDescriptor(
        input({ state: 'VERIFIED', verifiedAt: 'un jour' }),
      ),
    ).toEqual({ kind: 'CONFIGURED_UNVERIFIED' });
  });

  it('reports a dated verification as verified', () => {
    const descriptor = readHermesConnectionStateDescriptor(
      input({ state: 'VERIFIED', verifiedAt: '2026-10-30T09:40:00.000Z' }),
    );

    expect(descriptor.kind).toBe('VERIFIED');
    expect(
      descriptor.kind === 'VERIFIED' ? descriptor.verifiedAt.toISOString() : null,
    ).toBe('2026-10-30T09:40:00.000Z');
  });

  it('keeps who disabled a connection, because a decision has an author', () => {
    expect(
      readHermesConnectionStateDescriptor(
        input({
          state: 'DISABLED',
          disabledBy: 'Camille Rousseau',
          disabledAt: '2026-10-28T17:40:00.000Z',
        }),
      ),
    ).toEqual({
      kind: 'DISABLED',
      disabledBy: 'Camille Rousseau',
      disabledAt: new Date('2026-10-28T17:40:00.000Z'),
    });
  });

  it('does not invent a disabling date it was not given', () => {
    expect(
      readHermesConnectionStateDescriptor(
        input({ state: 'DISABLED', disabledAt: 'hier' }),
      ),
    ).toEqual({ kind: 'DISABLED', disabledBy: null, disabledAt: null });
  });

  it('keeps an error code and does not turn a blank one into a code', () => {
    expect(
      readHermesConnectionStateDescriptor(
        input({ state: 'ERROR', errorCode: 'AUTH_FAILED' }),
      ),
    ).toEqual({ kind: 'ERROR', errorCode: 'AUTH_FAILED' });

    expect(
      readHermesConnectionStateDescriptor(
        input({ state: 'ERROR', errorCode: '  ' }),
      ),
    ).toEqual({ kind: 'ERROR', errorCode: null });
  });
});

describe('formatHermesConnectionStateLabel', () => {
  it('uses the contract label for each of the five states', () => {
    expect(labelOf({ state: 'NOT_CONFIGURED' })).toBe('Non configuré');
    expect(labelOf({ state: 'CONFIGURED_UNVERIFIED' })).toBe(
      'Configuré, à vérifier',
    );
    expect(
      labelOf({ state: 'VERIFIED', verifiedAt: '2026-10-30T09:40:00.000Z' }),
    ).toBe('Connecté, vérifié le 30 oct. 2026 à 09:40');
    expect(labelOf({ state: 'ERROR' })).toBe('Connexion en erreur');
    expect(labelOf({ state: 'DISABLED' })).toBe('Connexion désactivée');
  });

  it('never says connected without a date after it', () => {
    expect(labelOf({ state: 'VERIFIED', verifiedAt: null })).toBe(
      'Configuré, à vérifier',
    );
  });

  it('does not reuse one of the five labels for a state it does not know', () => {
    expect(labelOf({ state: null, unknownState: 'HANDSHAKING' })).toBe(
      'État de connexion inconnu',
    );
  });

  it('tells a configured connection apart from a connected one', () => {
    expect(labelOf({ state: 'CONFIGURED_UNVERIFIED' })).not.toBe(
      labelOf({ state: 'VERIFIED', verifiedAt: '2026-10-30T09:40:00.000Z' }),
    );
  });

  it('tells a disabled connection apart from a failing one', () => {
    expect(labelOf({ state: 'DISABLED' })).not.toBe(labelOf({ state: 'ERROR' }));
  });
});

describe('isHermesConnectionEditable', () => {
  it('refuses to edit an administrator decision or an unread state', () => {
    expect(
      isHermesConnectionEditable({ kind: 'DISABLED', disabledBy: null, disabledAt: null }),
    ).toBe(false);
    expect(
      isHermesConnectionEditable({ kind: 'UNKNOWN', reported: null }),
    ).toBe(false);
  });

  it('allows editing what has a known, actionable state', () => {
    expect(isHermesConnectionEditable({ kind: 'NOT_CONFIGURED' })).toBe(true);
    expect(isHermesConnectionEditable({ kind: 'CONFIGURED_UNVERIFIED' })).toBe(
      true,
    );
    expect(isHermesConnectionEditable({ kind: 'ERROR', errorCode: null })).toBe(
      true,
    );
  });
});

describe('isHermesConnectionTestable', () => {
  it('offers no test where there is nothing to reach', () => {
    expect(isHermesConnectionTestable({ kind: 'NOT_CONFIGURED' })).toBe(false);
    expect(
      isHermesConnectionTestable({ kind: 'DISABLED', disabledBy: null, disabledAt: null }),
    ).toBe(false);
    expect(isHermesConnectionTestable({ kind: 'UNKNOWN', reported: null })).toBe(
      false,
    );
  });

  it('offers a test on something configured, verified or failing', () => {
    expect(isHermesConnectionTestable({ kind: 'CONFIGURED_UNVERIFIED' })).toBe(
      true,
    );
    expect(
      isHermesConnectionTestable({
        kind: 'VERIFIED',
        verifiedAt: new Date('2026-10-30T09:40:00.000Z'),
      }),
    ).toBe(true);
    expect(isHermesConnectionTestable({ kind: 'ERROR', errorCode: null })).toBe(
      true,
    );
  });
});
