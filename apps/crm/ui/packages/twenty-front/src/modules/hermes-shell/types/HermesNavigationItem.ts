import { type IconComponent } from 'kovaa-lab-ui/icon';

export type HermesNavigationItem = {
  key: string;
  label: string;
  to: string;
  Icon: IconComponent;
};

export type HermesNavigationSection = {
  key: string;
  label: string;
  items: HermesNavigationItem[];
};
