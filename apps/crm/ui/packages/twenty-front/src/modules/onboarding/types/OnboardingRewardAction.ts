import { type IconComponent } from 'kovaa-lab-ui/icon';

export type OnboardingRewardAction = {
  label: string;
  Icon?: IconComponent;
  creditsReward: number;
  isRewardPerItem?: boolean;
  onClick: () => void;
};
