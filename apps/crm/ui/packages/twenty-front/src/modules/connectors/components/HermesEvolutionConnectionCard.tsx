import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Trans } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HermesEvolutionConnectionTag } from '@/connectors/components/HermesEvolutionConnectionTag';
import { type HermesEvolutionConnection } from '@/connectors/types/HermesEvolutionConnection';

const StyledCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTopRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledProvider = styled.h3`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledDiagnostics = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  grid-template-columns: max-content 1fr;
  margin: 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  dd {
    font-size: ${themeCssVariables.font.size.sm};
    margin: 0;
  }
`;

type HermesEvolutionConnectionCardProps = {
  connection: HermesEvolutionConnection;
};

export const HermesEvolutionConnectionCard = ({
  connection,
}: HermesEvolutionConnectionCardProps) => {
  const { t, i18n } = useLingui();

  return (
    <StyledCard>
      <StyledTopRow>
        <StyledProvider>{connection.provider}</StyledProvider>
        <HermesEvolutionConnectionTag status={connection.status} />
      </StyledTopRow>

      {/* The distinction the backend contract insists on, spelled out where
          someone acts on it rather than buried in a tooltip. An open line is
          the provider's claim about its own socket, not evidence that a
          message left the system or reached anyone. */}
      {connection.status === 'PROVIDER_REPORTED_OPEN' && (
        <StyledNote>
          <Trans>
            This is what the provider reports about its own connection. It is
            not proof that a WhatsApp message was accepted, sent or delivered —
            only a real send can show that.
          </Trans>
        </StyledNote>
      )}

      {connection.status === 'NOT_CONFIGURED' && (
        <StyledNote>
          <Trans>
            No connection is set up yet. Configuration happens outside this
            screen, and no credentials are entered or shown here.
          </Trans>
        </StyledNote>
      )}

      <StyledDiagnostics>
        <dt>{t`Last checked`}</dt>
        <dd>
          {isDefined(connection.checkedAt)
            ? i18n.date(new Date(connection.checkedAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : t`Never checked — this is not a healthy line, it is an unknown one`}
        </dd>

        {isDefined(connection.providerState) && (
          <>
            <dt>{t`Provider state`}</dt>
            {/* Provider text, shown as a label only. It is never parsed into a
                status: the status field above is the only thing that decides
                what this card claims. */}
            <dd>{connection.providerState}</dd>
          </>
        )}

        {isDefined(connection.errorCode) && (
          <>
            <dt>{t`Error code`}</dt>
            <dd>{connection.errorCode}</dd>
          </>
        )}
      </StyledDiagnostics>

      <StyledNote>
        <Trans>
          No API key, address or instance name is shown on this screen, by
          design.
        </Trans>
      </StyledNote>
    </StyledCard>
  );
};
