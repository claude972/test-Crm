import { type FrontComponentStorageType } from 'kovaa-lab-sdk/front-component';

import { createFrontComponentStorageBridge } from '@/polyfills/storage/utils/createFrontComponentStorageBridge';
import { type FrontComponentStorageBridge } from '@/polyfills/storage/types/FrontComponentStorageBridge';

export const frontComponentStorageBridges: Record<
  FrontComponentStorageType,
  FrontComponentStorageBridge
> = {
  localStorage: createFrontComponentStorageBridge({
    storageType: 'localStorage',
  }),
  sessionStorage: createFrontComponentStorageBridge({
    storageType: 'sessionStorage',
  }),
};
