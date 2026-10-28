import React from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { LightIconButton } from 'kovaa-lab-ui/components/input';
import { type IconComponent } from 'kovaa-lab-ui/icon';

type BubbleMenuIconButtonProps = {
  label: string;
  Icon?: IconComponent;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isActive?: boolean;
};

export const BubbleMenuIconButton = ({
  label,
  Icon,
  disabled = false,
  onClick,
  isActive,
}: BubbleMenuIconButtonProps) => {
  return (
    <LightIconButton
      disabled={disabled}
      aria-pressed={isActive}
      onClick={onClick}
      variant={isActive ? 'soft' : 'ghost'}
      size="sm"
      aria-label={label}
    >
      {isDefined(Icon) && <Icon />}
    </LightIconButton>
  );
};
