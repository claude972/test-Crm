import { type AvatarShape } from 'kovaa-lab-ui/primitives/data-display';
import { type IconComponent } from 'kovaa-lab-ui/icon';

export type SelectableItem<T = object> = T & {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarShape?: AvatarShape;
  AvatarIcon?: IconComponent;
  isSelected: boolean;
  isIconInverted?: boolean;
};
