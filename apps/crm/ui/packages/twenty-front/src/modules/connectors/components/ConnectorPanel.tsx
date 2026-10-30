import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { isDefined } from 'kovaa-lab-shared/utils';

import { ConnectorDiagnostics } from '@/connectors/components/ConnectorDiagnostics';
import { ConnectorStateTag } from '@/connectors/components/ConnectorStateTag';
import { type ConnectorDescriptor } from '@/connectors/types/ConnectorDescriptor';
import { type ConnectorReadState } from '@/connectors/types/ConnectorReadState';
import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';

const StyledPanel = styled.article`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledIdentity = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-inline-size: 0;
`;

const StyledConnectorIcon = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.md} * 1px);
    inline-size: calc(${themeCssVariables.icon.size.md} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.md};
  }
`;

const StyledNaming = styled.div`
  display: grid;
  min-inline-size: 0;
`;

const StyledName = styled.h3`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledChannel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMeta = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

type ConnectorPanelProps = {
  descriptor: ConnectorDescriptor;
  state: ConnectorReadState;
};

// The single surface every connector is shown on, so none of them can acquire
// a friendlier presentation than the others.
export const ConnectorPanel = ({ descriptor, state }: ConnectorPanelProps) => {
  const { t, i18n } = useLingui();
  const { Icon } = descriptor;

  const checkedAt =
    state.kind === 'reported'
      ? parseConnectorCheckedAt(state.connection.checkedAt)
      : undefined;

  const lastCheckedDate =
    isDefined(checkedAt) && checkedAt.kind === 'at'
      ? i18n.date(checkedAt.date, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : undefined;

  const checkedAtLabel = !isDefined(checkedAt)
    ? undefined
    : isDefined(lastCheckedDate)
      ? t`Last checked ${lastCheckedDate}`
      : checkedAt.kind === 'never'
        ? t`Never checked`
        : t`Last check time unknown`;

  return (
    <StyledPanel>
      <StyledHeader>
        <StyledIdentity>
          <StyledConnectorIcon aria-hidden>
            <Icon />
          </StyledConnectorIcon>
          <StyledNaming>
            <StyledName>{i18n._(descriptor.name)}</StyledName>
            <StyledChannel>{i18n._(descriptor.channel)}</StyledChannel>
          </StyledNaming>
        </StyledIdentity>

        {/* Announced once when it settles, so a move from checking to a
            result reaches a screen reader without being read as an alarm. */}
        <div role="status" aria-live="polite">
          <ConnectorStateTag state={state} />
        </div>
      </StyledHeader>

      {isDefined(checkedAtLabel) && <StyledMeta>{checkedAtLabel}</StyledMeta>}

      {state.kind === 'reported' && (
        <ConnectorDiagnostics
          provider={state.connection.provider}
          providerState={state.connection.providerState}
          errorCode={state.connection.errorCode}
        />
      )}
    </StyledPanel>
  );
};
