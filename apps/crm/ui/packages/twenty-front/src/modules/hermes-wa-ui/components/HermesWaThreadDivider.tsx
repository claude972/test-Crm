import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledPill = styled.div`
  align-self: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.medium};
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  text-align: center;

  /* The unread marker is set apart by its border and its words first; the
     accent tint is the third signal, never the only one. */
  &[data-unread='true'] {
    background: ${themeCssVariables.background.transparent.blue};
    border-color: ${themeCssVariables.border.color.blue};
    color: ${themeCssVariables.font.color.primary};
  }
`;

type HermesWaDayDividerProps = {
  // Already formatted: formatting a date needs a locale and a time zone this
  // component is not given, so it does not invent one.
  label: string | null;
};

// The band between two days. A blank label says the day is unknown rather
// than rendering an empty pill, which reads as a missing message.
export const HermesWaDayDivider = ({ label }: HermesWaDayDividerProps) => {
  const { t } = useLingui();

  const trimmed = label?.trim();

  return (
    <StyledPill role="separator">
      {isNonEmptyString(trimmed) ? trimmed : t`Date unknown`}
    </StyledPill>
  );
};

type HermesWaUnreadDividerProps = {
  // Null when the count is not known, which is different from zero.
  count: number | null;
};

// The line above the first unseen message. A zero count renders nothing: a
// marker that says "0 unread" should not be there. An absent count still
// renders the marker, because the position itself is the fact.
export const HermesWaUnreadDivider = ({
  count,
}: HermesWaUnreadDividerProps) => {
  const { t, i18n } = useLingui();

  if (count !== null && (!Number.isFinite(count) || count <= 0)) {
    return null;
  }

  const formattedCount = count === null ? null : i18n.number(count);

  return (
    <StyledPill role="separator" data-unread="true">
      {formattedCount === null
        ? t`Unread from here`
        : t`${formattedCount} unread from here`}
    </StyledPill>
  );
};
