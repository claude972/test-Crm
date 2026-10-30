import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';

// An instant the source did not give, or gave unusably. Said in words and in
// the lighter colour, so it never reads as a value.
const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

type ClientContextInstantProps = {
  value: string | null;
  // Shown instead of "Unknown" when a missing instant has a specific meaning
  // for this field.
  absentLabel?: string;
  withTime?: boolean;
};

// One instant, in the three cases a timestamp can actually be in. An absent
// instant and an unreadable one are different answers, and neither of them is
// formatted as a moment the client picked. Formatting an Invalid Date throws a
// RangeError, which would take the whole record page down.
export const ClientContextInstant = ({
  value,
  absentLabel,
  withTime = true,
}: ClientContextInstantProps) => {
  const { t, i18n } = useLingui();

  const parsed = parseConnectorCheckedAt(value);

  if (parsed.kind === 'never') {
    return <StyledMissing>{absentLabel ?? t`Unknown`}</StyledMissing>;
  }

  if (parsed.kind === 'unreadable') {
    return <StyledMissing>{t`Unreadable`}</StyledMissing>;
  }

  return (
    <span>
      {i18n.date(
        parsed.date,
        withTime
          ? { dateStyle: 'medium', timeStyle: 'short' }
          : { dateStyle: 'medium' },
      )}
    </span>
  );
};
