import { type RunAgentResult } from 'kovaa-lab-shared/application';

export type SettledAgentRun = Pick<
  RunAgentResult,
  'status' | 'result' | 'error'
>;
