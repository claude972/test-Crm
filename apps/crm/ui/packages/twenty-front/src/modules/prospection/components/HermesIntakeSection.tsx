import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ConnectorDiagnostics } from '@/connectors/components/ConnectorDiagnostics';
import { HermesIntakeStateTag } from '@/prospection/components/HermesIntakeStateTag';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { type HermesIntakeReadState } from '@/prospection/types/HermesIntakeState';
import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';

const StyledState = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledFacts = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: max-content minmax(0, 1fr);
  margin: 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  dd {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

type HermesIntakeSectionProps = {
  state: HermesIntakeReadState;
};

// The automatic reception, presented as the normal way collections arrive.
//
// There is no button here, and there is nothing to press: the entry point is
// configured outside this screen, and its contract is not published, so any
// control would promise work that cannot happen. What the section does is say
// precisely what the client knows and what it is waiting for.
export const HermesIntakeSection = ({ state }: HermesIntakeSectionProps) => {
  const { t, i18n } = useLingui();

  const endpoint = state.kind === 'reported' ? state.endpoint : null;

  const lastCollection = isDefined(endpoint)
    ? parseConnectorCheckedAt(endpoint.lastCollectionAt)
    : null;

  const lastCollectionLabel = !isDefined(lastCollection)
    ? null
    : lastCollection.kind === 'at'
      ? i18n.date(lastCollection.date, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : lastCollection.kind === 'never'
        ? t`Never`
        : t`Unreadable`;

  return (
    <Section.Root>
      <Section.Header
        title={t`Automatic reception`}
        description={t`Collections arrive through the authenticated entry point. This is the normal path; the manual deposit below is kept for a one-off.`}
      />

      {/* Announced once when it settles, so a move from checking to a result
          reaches a screen reader without being read as an alarm. */}
      <StyledState role="status" aria-live="polite">
        <HermesIntakeStateTag state={state} />
      </StyledState>

      {state.kind === 'awaiting-contract' && (
        <>
          <ProspectionNote>
            <Trans>
              This screen cannot read the entry point yet: its contract is not
              published. Nothing is missing from your workspace.
            </Trans>
          </ProspectionNote>
          <ProspectionNote>
            <Trans>
              Collections already received are listed below, whatever path they
              came in through.
            </Trans>
          </ProspectionNote>
        </>
      )}

      {state.kind === 'loading' && (
        <ProspectionNote>
          <Trans>Loading…</Trans>
        </ProspectionNote>
      )}

      {/* An authorisation answer, said as one: the Hermes operations are
          restricted to live workspace members with unrestricted administrator
          permissions. */}
      {state.kind === 'denied' && (
        <>
          <ProspectionNote role="alert">
            <Trans>
              Not authorised: unrestricted workspace administrators only.
            </Trans>
          </ProspectionNote>
          <ProspectionNote>
            <Trans>API keys, apps and impersonated sessions are refused.</Trans>
          </ProspectionNote>
        </>
      )}

      {state.kind === 'not-configured' && (
        <ProspectionNote>
          <Trans>
            No entry point set up for this workspace. It is configured outside
            this screen.
          </Trans>
        </ProspectionNote>
      )}

      {state.kind === 'unreadable' && (
        <HermesPayloadProblemNote
          problem={state.problem}
          subject={t`Entry point`}
        />
      )}

      {isDefined(endpoint) && (
        <>
          <StyledFacts>
            <dt>{t`Entry point`}</dt>
            <dd>
              {isNonEmptyString(endpoint.label) ? (
                endpoint.label
              ) : (
                <StyledMissing>{t`Unnamed`}</StyledMissing>
              )}
            </dd>
            <dt>{t`Reference`}</dt>
            <dd>
              {isNonEmptyString(endpoint.id) ? (
                endpoint.id
              ) : (
                <StyledMissing>{t`Unknown`}</StyledMissing>
              )}
            </dd>
            <dt>{t`Last collection`}</dt>
            <dd>
              {isNonEmptyString(lastCollectionLabel) ? (
                lastCollectionLabel
              ) : (
                <StyledMissing>{t`Unknown`}</StyledMissing>
              )}
            </dd>
          </StyledFacts>

          {/* Folded away: a provider's own wording belongs on screen, but not
              in front of the state. Rendered as a value, never parsed. */}
          <ConnectorDiagnostics
            providerState={endpoint.providerState}
            errorCode={endpoint.errorCode}
          />
        </>
      )}
    </Section.Root>
  );
};
