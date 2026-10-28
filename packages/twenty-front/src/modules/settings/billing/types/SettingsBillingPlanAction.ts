import { type IconComponent } from 'kovaa-lab-ui/icon';
import {
  type ButtonColor,
  type ButtonVariant,
} from 'kovaa-lab-ui/primitives/input';

export type SettingsBillingPlanAction = {
  color?: ButtonColor;
  disabled?: boolean;
  Icon?: IconComponent;
  isLoading?: boolean;
  onClick?: () => void;
  title: string;
  variant: ButtonVariant;
};
