import type { ApplicationHealthCheckResult } from 'kovaa-lab-shared/application';

export type HealthCheckHandler = () =>
  | ApplicationHealthCheckResult
  | Promise<ApplicationHealthCheckResult>;
