import { PermissionFlagType } from 'kovaa-lab-shared/constants';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';

export const getConnectedAccountAdministrationPermissionFlag = (
  provider: ConnectedAccountProvider,
): PermissionFlagType =>
  provider === ConnectedAccountProvider.APP
    ? PermissionFlagType.APPLICATIONS
    : PermissionFlagType.WORKSPACE;
