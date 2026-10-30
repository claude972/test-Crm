// Whether what this screen holds still belongs to the company it names.
// A result that came back after a switch belongs to the previous company, so
// it is dropped rather than shown. 'session-replaced' is the backend's named
// refusal — session and native cookie no longer agree — and it is an answer,
// never retried here and never hidden behind a loading state.
export type HermesAdminContextValidity =
  | { kind: 'current' }
  | {
      kind: 'stale';
      reason: 'company-switched' | 'session-replaced';
      message: string | null;
    };

export const HERMES_ADMIN_CONTEXT_CURRENT: HermesAdminContextValidity = {
  kind: 'current',
};
