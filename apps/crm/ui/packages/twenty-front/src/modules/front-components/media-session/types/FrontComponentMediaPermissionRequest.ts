import { type ApplicationCapability } from 'kovaa-lab-shared/application';

export type FrontComponentMediaPermissionRequest = {
  capabilities: ApplicationCapability[];
  abortSignal: AbortSignal;
  resolve: (grantedCapabilities: string[] | null) => void;
};
