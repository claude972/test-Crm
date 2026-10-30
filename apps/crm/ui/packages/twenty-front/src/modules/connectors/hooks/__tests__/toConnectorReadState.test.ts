import { toConnectorReadState } from '@/connectors/hooks/useHermesEvolutionConnection';
import { isHermesEvolutionConnectionStatus } from '@/connectors/types/HermesEvolutionConnectionStatus';

const CONNECTION = {
  workspaceId: 'workspace-1',
  provider: 'evolution',
  status: 'PROVIDER_REPORTED_OPEN',
  providerState: 'open',
  checkedAt: '2026-10-29T08:30:00.000Z',
  errorCode: null,
};

describe('isHermesEvolutionConnectionStatus', () => {
  it('admits exactly the five published values', () => {
    expect(isHermesEvolutionConnectionStatus('NOT_CONFIGURED')).toBe(true);
    expect(isHermesEvolutionConnectionStatus('PROVIDER_REPORTED_OPEN')).toBe(
      true,
    );
    expect(isHermesEvolutionConnectionStatus('CONNECTING')).toBe(true);
    expect(isHermesEvolutionConnectionStatus('DISCONNECTED')).toBe(true);
    expect(isHermesEvolutionConnectionStatus('UNAVAILABLE')).toBe(true);
  });

  it('rejects anything else, including a lowercase sync-vocabulary value', () => {
    expect(isHermesEvolutionConnectionStatus('CONNECTED')).toBe(false);
    expect(isHermesEvolutionConnectionStatus('confirmed')).toBe(false);
    expect(isHermesEvolutionConnectionStatus('')).toBe(false);
    expect(isHermesEvolutionConnectionStatus(null)).toBe(false);
    expect(isHermesEvolutionConnectionStatus(2)).toBe(false);
  });
});

describe('toConnectorReadState', () => {
  it('reads a failed read as unknown, never as disconnected', () => {
    const state = toConnectorReadState({
      connection: undefined,
      isLoading: false,
      hasError: true,
    });

    expect(state).toEqual({ kind: 'unknown' });
  });

  it('keeps a retry after a failure in progress rather than failed', () => {
    expect(
      toConnectorReadState({
        connection: undefined,
        isLoading: true,
        hasError: true,
      }),
    ).toEqual({ kind: 'loading' });
  });

  it('does not treat a payload that arrived with an error as reported', () => {
    const state = toConnectorReadState({
      connection: CONNECTION,
      isLoading: false,
      hasError: true,
    });

    expect(state.kind).toBe('unknown');
  });

  it('reads an absent connection as nothing configured', () => {
    expect(
      toConnectorReadState({
        connection: null,
        isLoading: false,
        hasError: false,
      }),
    ).toEqual({ kind: 'absent' });
  });

  it('refuses a status outside the published set instead of guessing one', () => {
    const state = toConnectorReadState({
      connection: { ...CONNECTION, status: 'CONNECTED' },
      isLoading: false,
      hasError: false,
    });

    expect(state).toEqual({ kind: 'unknown' });
  });

  it('reports a published status with its diagnostics', () => {
    const state = toConnectorReadState({
      connection: CONNECTION,
      isLoading: false,
      hasError: false,
    });

    expect(state).toEqual({ kind: 'reported', connection: CONNECTION });
  });
});
