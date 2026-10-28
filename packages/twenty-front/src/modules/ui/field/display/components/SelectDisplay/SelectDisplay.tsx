import { type IconComponent } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { type ThemeColor } from 'kovaa-lab-ui/theme';
import { isDefined } from 'kovaa-lab-shared/utils';

type SelectDisplayProps = {
  color: ThemeColor | 'transparent';
  label: string;
  Icon?: IconComponent;
};

export const SelectDisplay = ({ color, label, Icon }: SelectDisplayProps) => (
  <Tag
    truncate={false}
    color={color}
    startIcon={isDefined(Icon) ? <Icon /> : undefined}
  >
    {label}
  </Tag>
);
