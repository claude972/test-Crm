import { type FrontComponentStorageType } from 'kovaa-lab-sdk/front-component';

export type FrontComponentStorageSnapshots = Record<
  FrontComponentStorageType,
  Record<string, string>
>;
