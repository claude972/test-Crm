import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Fragment } from 'react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledDetails = styled.details`
  font-size: ${themeCssVariables.font.size.sm};

  summary {
    color: ${themeCssVariables.font.color.tertiary};
    cursor: pointer;
    width: fit-content;
  }

  summary:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[1]};
  }
`;

const StyledRows = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  grid-template-columns: max-content minmax(0, 1fr);
  margin: ${themeCssVariables.spacing[2]} 0 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

type ConnectorDiagnosticsProps = {
  provider?: string | null;
  providerState?: string | null;
  errorCode?: string | null;
};

// Folded away by default: a reason belongs on screen, but not in front of the
// state. Provider text is rendered as a value, never parsed into a status and
// never injected as markup.
export const ConnectorDiagnostics = ({
  provider,
  providerState,
  errorCode,
}: ConnectorDiagnosticsProps) => {
  const { t } = useLingui();

  const rows = [
    { key: 'provider', label: t`Provider`, value: provider?.trim() },
    {
      key: 'providerState',
      label: t`Reported state`,
      value: providerState?.trim(),
    },
    { key: 'errorCode', label: t`Error code`, value: errorCode?.trim() },
  ].filter(
    (row): row is { key: string; label: string; value: string } =>
      isNonEmptyString(row.value),
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <StyledDetails>
      <summary>
        <Trans>Details</Trans>
      </summary>
      <StyledRows>
        {rows.map((row) => (
          <Fragment key={row.key}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </Fragment>
        ))}
      </StyledRows>
    </StyledDetails>
  );
};
