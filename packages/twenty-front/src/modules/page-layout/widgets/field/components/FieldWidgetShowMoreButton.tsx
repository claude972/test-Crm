import { t } from '@lingui/core/macro';
import { LightButton } from 'kovaa-lab-ui/components/input';
import { IconChevronDown } from 'kovaa-lab-ui/icon';

type FieldWidgetShowMoreButtonProps = {
  remainingCount: number;
  onClick: () => void;
};

export const FieldWidgetShowMoreButton = ({
  remainingCount,
  onClick,
}: FieldWidgetShowMoreButtonProps) => (
  <LightButton
    emphasis="subtle"
    size="sm"
    startIcon={<IconChevronDown />}
    data-testid="field-widget-show-more-button"
    onClick={onClick}
  >
    {t`More (${remainingCount})`}
  </LightButton>
);
