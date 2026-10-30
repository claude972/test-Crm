import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ConnectorDiagnostics } from '@/connectors/components/ConnectorDiagnostics';
import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';
import {
  HermesIntakeAcceptanceTag,
  HermesIntakeStateTag,
} from '@/prospection/components/HermesIntakeStateTag';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import {
  type HermesIntakeEndpoint,
  type HermesIntakeReadState,
} from '@/prospection/types/HermesIntakeState';

const StyledState = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledEndpoints = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledEndpoint = styled.article`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledEndpointHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledStructure = styled.h3`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
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

type HermesIntakeEndpointCardProps = {
  endpoint: HermesIntakeEndpoint;
};

// One structure's entry point. It shows the four facts this screen is allowed
// to show — which structure, what state, when it last received, and the
// server's folded diagnostic — and nothing else.
//
// Deliberately absent: the webhook URL, the connection identifier, the HMAC
// secret, the nonce and any action that would post to the endpoint. The intake
// is server to server; a control here would be a control the browser cannot
// legitimately exercise.
const HermesIntakeEndpointCard = ({
  endpoint,
}: HermesIntakeEndpointCardProps) => {
  const { t, i18n } = useLingui();

  const lastCollection = parseConnectorCheckedAt(endpoint.lastCollectionAt);

  const lastCollectionLabel =
    lastCollection.kind === 'at'
      ? i18n.date(lastCollection.date, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : lastCollection.kind === 'never'
        ? t`Never`
        : t`Unreadable`;

  return (
    <StyledEndpoint>
      <StyledEndpointHeader>
        {isNonEmptyString(endpoint.structureName) ? (
          <StyledStructure>{endpoint.structureName}</StyledStructure>
        ) : (
          <StyledStructure>
            <StyledMissing>{t`Structure not named`}</StyledMissing>
          </StyledStructure>
        )}
        {/* Announced once when it settles, so a move from checking to a
            result reaches a screen reader without being read as an alarm. */}
        <div role="status" aria-live="polite">
          <HermesIntakeAcceptanceTag isAccepting={endpoint.isAccepting} />
        </div>
      </StyledEndpointHeader>

      <StyledFacts>
        <dt>{t`Entry point`}</dt>
        <dd>
          {isNonEmptyString(endpoint.label) ? (
            endpoint.label
          ) : (
            <StyledMissing>{t`Unnamed`}</StyledMissing>
          )}
        </dd>
        <dt>{t`Last collection`}</dt>
        <dd>{lastCollectionLabel}</dd>
      </StyledFacts>

      {/* Folded away: a server's own wording belongs on screen, but not in
          front of the state. Rendered as a value, never parsed. */}
      <ConnectorDiagnostics
        providerState={endpoint.providerState}
        errorCode={endpoint.errorCode}
      />
    </StyledEndpoint>
  );
};

type HermesIntakeSectionProps = {
  state: HermesIntakeReadState;
};

// The automatic reception, presented as the normal way collections arrive.
//
// There is no button here, and there is nothing to press. The intake is a
// server-to-server webhook signed with a secret the browser must never hold,
// delegated per structure and configured outside this screen. What the section
// does is say precisely what the client knows and what it is waiting for.
export const HermesIntakeSection = ({ state }: HermesIntakeSectionProps) => {
  const { t } = useLingui();

  return (
    <Section.Root>
      <Section.Header
        title={t`Automatic reception`}
        description={t`Collections are posted to an authenticated entry point, one per structure. This is the normal path; the manual deposit below is kept for a one-off.`}
      />

      {/* Said once, so nobody looks for a control that must not exist. */}
      <ProspectionNote>
        <Trans>
          Server to server: the entry point is signed and configured outside
          this screen. Nothing here sends, tests or reveals its credentials.
        </Trans>
      </ProspectionNote>

      {state.kind !== 'reported' && (
        <StyledState role="status" aria-live="polite">
          <HermesIntakeStateTag state={state} />
        </StyledState>
      )}

      {state.kind === 'awaiting-contract' && (
        <>
          <ProspectionNote>
            <Trans>
              This screen cannot read the entry point state yet: the query is
              not published. Nothing is missing from your workspace.
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
            No structure has an entry point delegated to it. Delegation happens
            outside this screen.
          </Trans>
        </ProspectionNote>
      )}

      {state.kind === 'unreadable' && (
        <HermesPayloadProblemNote
          problem={state.problem}
          subject={t`Entry point`}
        />
      )}

      {state.kind === 'reported' &&
        (state.endpoints.length === 0 ? (
          // The server answered with no entry point at all. A fact, and it
          // reads the same as 'not-configured' because it is the same fact.
          <ProspectionNote>
            <Trans>
              No structure has an entry point delegated to it. Delegation
              happens outside this screen.
            </Trans>
          </ProspectionNote>
        ) : (
          <StyledEndpoints>
            {state.endpoints.map((endpoint, index) => (
              <HermesIntakeEndpointCard
                // The connection identifier is the stable key when the payload
                // carried one; it is used here and rendered nowhere.
                key={
                  endpoint.connectionId ??
                  endpoint.structureId ??
                  `endpoint-${index}`
                }
                endpoint={endpoint}
              />
            ))}
          </StyledEndpoints>
        ))}
    </Section.Root>
  );
};
