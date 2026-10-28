import { type ShortcutDefinition } from 'kovaa-lab-ui/primitives/typography';
import { type IconComponent } from 'kovaa-lab-ui/icon';

export type SidePanelFooterCommandMenuItem = {
  id: string;
  label: string;
  Icon?: IconComponent;
  isPrimaryCTA?: boolean;
  isPinned?: boolean;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: ShortcutDefinition;
};
