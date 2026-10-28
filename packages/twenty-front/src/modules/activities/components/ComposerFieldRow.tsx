import { type MouseEvent, type MouseEventHandler, type ReactNode } from 'react';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';
import { isDefined } from 'kovaa-lab-shared/utils';
import { FormFieldRow } from 'kovaa-lab-ui/components/input';

const NESTED_CONTROL_SELECTOR = doNotTranslate(
  'input, textarea, button, a[href], [role="button"]',
);

type ComposerFieldRowProps = {
  label: string;
  children: ReactNode;
  isLabelVisible?: boolean;
  trailing?: ReactNode;
  hasDivider?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
};

export const ComposerFieldRow = ({
  label,
  children,
  isLabelVisible = true,
  trailing,
  hasDivider,
  onClick,
}: ComposerFieldRowProps) => {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const row = event.currentTarget;
    const nestedControl = event.target.closest(NESTED_CONTROL_SELECTOR);
    const isFromPortaledContent = !row.contains(event.target);
    const isOnNestedControl =
      isDefined(nestedControl) && row.contains(nestedControl);

    if (isFromPortaledContent || isOnNestedControl) {
      return;
    }

    onClick?.(event);
  };

  return (
    <FormFieldRow
      label={isLabelVisible ? label : undefined}
      aria-label={label}
      hasDivider={hasDivider}
      isHoverable={isDefined(onClick)}
      onClick={isDefined(onClick) ? handleClick : undefined}
      trailing={trailing}
      trailingProps={{ onClick: (event) => event.stopPropagation() }}
    >
      {children}
    </FormFieldRow>
  );
};
