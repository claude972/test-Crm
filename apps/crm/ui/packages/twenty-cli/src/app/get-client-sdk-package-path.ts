import { join } from 'node:path';

export const getClientSdkPackagePath = ({ appPath }: { appPath: string }) =>
  join(appPath, 'node_modules', 'kovaa-lab-client-sdk');
