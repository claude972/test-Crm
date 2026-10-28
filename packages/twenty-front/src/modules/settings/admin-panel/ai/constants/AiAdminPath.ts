import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';

export const AI_ADMIN_PATH = getSettingsPath(
  SettingsPath.AdminPanel,
  undefined,
  undefined,
  'ai',
);
