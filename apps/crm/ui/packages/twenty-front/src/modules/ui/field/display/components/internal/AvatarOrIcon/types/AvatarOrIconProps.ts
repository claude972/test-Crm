import { type IconComponent } from 'kovaa-lab-ui/icon';
import {
  type AvatarProps,
  type AvatarShape,
} from 'kovaa-lab-ui/primitives/data-display';
import { type Nullable } from 'kovaa-lab-shared/types';

export type AvatarOrIconProps = Pick<
  AvatarProps,
  'src' | 'name' | 'colorSeed'
> & {
  shape?: Nullable<AvatarShape>;
  Icon?: IconComponent;
  IconColor?: string;
  IconBackgroundColor?: string;
  isIconInverted?: boolean;
  onClick?: () => void;
};
