export type EvolutionProbeStatus =
  | 'NOT_CONFIGURED'
  | 'CONNECTED'
  | 'CONNECTING'
  | 'DISCONNECTED'
  | 'UNAVAILABLE';

export type EvolutionProbeErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'INSTANCE_NOT_FOUND'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_ERROR'
  | 'REQUEST_FAILED';

export type EvolutionConnectionProbe = {
  workspaceId: string;
  provider: 'EVOLUTION';
  status: EvolutionProbeStatus;
  providerState: 'open' | 'close' | 'connecting' | null;
  checkedAt: string;
  errorCode: EvolutionProbeErrorCode | null;
};
