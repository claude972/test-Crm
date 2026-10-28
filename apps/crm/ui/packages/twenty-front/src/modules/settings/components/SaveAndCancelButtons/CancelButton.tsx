import { useLingui } from '@lingui/react/macro';
import { LightButton } from 'kovaa-lab-ui/components/input';
import { Button, type ButtonColor } from 'kovaa-lab-ui/primitives/input';

type CancelButtonProps = {
  onCancel?: () => void;
  disabled?: boolean;
  color?: ButtonColor;
};

export const CancelButton = ({
  onCancel,
  disabled = false,
  color,
}: CancelButtonProps) => {
  const { t } = useLingui();

  if (color === 'inherit') {
    return (
      <Button
        color={color}
        size="sm"
        onClick={onCancel}
        disabled={disabled}
        variant="ghost"
      >{t`Cancel`}</Button>
    );
  }

  return (
    <LightButton
      emphasis="subtle"
      color={color}
      onClick={onCancel}
      disabled={disabled}
    >{t`Cancel`}</LightButton>
  );
};
