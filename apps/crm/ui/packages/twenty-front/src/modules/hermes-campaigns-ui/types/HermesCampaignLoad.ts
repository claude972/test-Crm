// How a section's data arrived. Five answers, because an empty answer, an
// answer still being read, a refused answer and a product that was never
// configured are four different things on screen.
export type HermesCampaignLoad<TValue> =
  | { kind: 'loading' }
  // No campaign, no identity, no connection: nothing to show yet, and the
  // reason is a configuration step rather than a failure.
  | { kind: 'not-configured'; detail: string | null }
  | { kind: 'empty' }
  | {
      kind: 'failed';
      reasonCode: string | null;
      reason: string | null;
    }
  | { kind: 'ready'; value: TValue };
