import { t } from '@lingui/core/macro';
import { type IconComponent, IconDeviceFloppy } from 'kovaa-lab-ui/icon';
import { Button, type ButtonColor } from 'kovaa-lab-ui/primitives/input';

type SaveButtonProps = {
  onSave?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  color?: ButtonColor;
  saveIcon?: IconComponent;
};

export const SaveButton = ({
  onSave,
  disabled,
  isLoading,
  color = 'accent',
  saveIcon: SaveIcon = IconDeviceFloppy,
}: SaveButtonProps) => {
  return (
    <Button
      size="sm"
      disabled={disabled}
      onClick={onSave}
      type="submit"
      startIcon={<SaveIcon />}
      loading={isLoading}
      variant={color === 'inherit' ? 'outline' : 'solid'}
      color={color}
    >{t`Save`}</Button>
  );
};
