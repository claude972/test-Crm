import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const persistedColorSchemeState = createAtomState<ColorScheme>({
  key: 'persistedColorSchemeState',
  defaultValue: doNotTranslate('System'),
  useLocalStorage: true,
});
