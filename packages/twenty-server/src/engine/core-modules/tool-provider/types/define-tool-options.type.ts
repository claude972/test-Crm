import { type ToolCategory } from 'kovaa-lab-shared/ai';
import { type PermissionFlagType } from 'kovaa-lab-shared/constants';
import { type FeatureFlagKey } from 'kovaa-lab-shared/types';

export type DefineToolOptions = {
  name: string;
  category: ToolCategory;
  description: string;
  requiredPermissionFlags: PermissionFlagType[];
  requiredFeatureFlags?: FeatureFlagKey[];
  icon?: string;
};
