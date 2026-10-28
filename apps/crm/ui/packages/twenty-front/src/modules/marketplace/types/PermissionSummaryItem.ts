import { type IconComponent } from 'kovaa-lab-ui/icon';

export type PermissionSummaryItem = {
  Icon: IconComponent;
  label: string;
  details?: {
    title: string;
    items: string[];
  };
};
