import { useMediaQuery } from 'kovaa-lab-ui/utilities';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const useSystemColorScheme = (): ColorScheme =>
  useMediaQuery(doNotTranslate('(prefers-color-scheme: dark)'))
    ? doNotTranslate('Dark')
    : doNotTranslate('Light');
