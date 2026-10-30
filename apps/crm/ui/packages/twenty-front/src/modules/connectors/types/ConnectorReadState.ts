import { type HermesEvolutionConnection } from '@/connectors/types/HermesEvolutionConnection';

// What the client actually knows about one connector, as opposed to what the
// connector is. Every surface renders this union, so the three honesty rules
// hold everywhere by construction:
//
// - a failed read is 'unknown', never 'disconnected';
// - a connector the server publishes no status for is 'not-reported', not
//   'configured' and not 'broken';
// - only 'reported' carries a status, and that status is always one of the
//   five published values.
export type ConnectorReadState =
  | { kind: 'loading' }
  | { kind: 'unknown' }
  | { kind: 'absent' }
  | { kind: 'not-reported' }
  | { kind: 'reported'; connection: HermesEvolutionConnection };
