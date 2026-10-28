import { type ShortcutDefinition } from 'kovaa-lab-ui/primitives/typography';

export type NavigationDrawerItemModifier =
  | 'soon'
  | 'new'
  | { keyboard: ShortcutDefinition };
