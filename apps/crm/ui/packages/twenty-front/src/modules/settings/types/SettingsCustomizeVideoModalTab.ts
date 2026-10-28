import { type IconComponent } from 'kovaa-lab-ui/icon';

export type SettingsCustomizeVideoModalTab = {
  id: string;
  title: string;
  Icon: IconComponent;
  vimeoId: string;
  hasSound?: boolean;
};
