import { type FeatureFlagKey } from 'kovaa-lab-shared/types';

export type FeatureFlagMap = Record<`${FeatureFlagKey}`, boolean>;
