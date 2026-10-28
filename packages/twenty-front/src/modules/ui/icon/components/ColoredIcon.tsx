import { getIconTileColorShades } from 'kovaa-lab-ui/components/data-display';
import { type IconComponent } from 'kovaa-lab-ui/icon';
import { useTheme } from 'kovaa-lab-ui/theme';

type ColoredIconProps = {
  Icon: IconComponent;
  color?: string | null;
  size?: number;
  stroke?: number;
};

export const ColoredIcon = ({
  Icon,
  color,
  size,
  stroke,
}: ColoredIconProps) => {
  const theme = useTheme();

  return (
    <Icon
      size={size ?? theme.icon.size.md}
      stroke={stroke ?? theme.icon.stroke.md}
      color={getIconTileColorShades(color).iconColor}
    />
  );
};
