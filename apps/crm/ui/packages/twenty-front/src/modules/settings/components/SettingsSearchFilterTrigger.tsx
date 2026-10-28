import { useLingui } from '@lingui/react/macro';
import { IconButton } from 'kovaa-lab-ui/components/input';
import { Dropdown } from 'kovaa-lab-ui/components/navigation';
import { IconFilter } from 'kovaa-lab-ui/icon';

type SettingsSearchFilterTriggerProps = {
  ariaLabel?: string;
};

export const SettingsSearchFilterTrigger = ({
  ariaLabel,
}: SettingsSearchFilterTriggerProps) => {
  const { t } = useLingui();

  return (
    <Dropdown.Trigger
      render={
        <IconButton aria-label={ariaLabel ?? t`Filter`}>
          <IconFilter />
        </IconButton>
      }
    />
  );
};
