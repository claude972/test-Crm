import { AppPath, SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';

export const CAPTCHA_PROTECTED_PATHS: string[] = [
  AppPath.SignInUp,
  AppPath.Verify,
  AppPath.VerifyEmail,
  AppPath.ResetPassword,
  AppPath.Invite,
  getSettingsPath(SettingsPath.ProfilePage),
];
