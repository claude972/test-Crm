import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAttributionTag } from '@/prospection/components/HermesAttributionTag';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import {
  type HermesInboundSource,
  type HermesScrapingClassificationReadState,
  type HermesScrapingDeposit,
} from '@/prospection/types/HermesInboundClassification';

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

type HermesInboundProvenancePanelProps = {
  // The collection on screen. The panel shows the server's classification of
  // this deposit and of no other.
  batchId: string;
  state: HermesScrapingClassificationReadState;
};

// How the server classified the deposit on screen: which signed connection it
// is attributable to, which company it belongs to, the real row outcomes
// including duplicates, and what it already touches in the CRM.
//
// THE ONE THING THIS PANEL MUST NEVER SAY. A linked opportunity listed here
// already pointed at the contact before this deposit existed. Nothing on an
// inbound path opens a deal, and the wording below states that rather than
// leaving the reader to infer it from a list of opportunities sitting under a
// reception. The server attests it on every answer and the panel reports a
// disagreement loudly instead of keeping the reassuring sentence.
export const HermesInboundProvenancePanel = ({
  batchId,
  state,
}: HermesInboundProvenancePanelProps) => {
  const { t, i18n } = useLingui();

  const sourceLabels: Record<HermesInboundSource, string> = {
    forms: t`Form answer`,
    calendar: t`Booking`,
    scraping: t`Scraping deposit`,
  };

  const renderCount = (value: number | null) =>
    value === null ? (
      <StyledMissing>{t`Unknown`}</StyledMissing>
    ) : (
      i18n.number(value)
    );

  const renderFacts = (deposit: HermesScrapingDeposit) => (
    <>
      <StyledFacts>
        <dt>{t`Attribution`}</dt>
        <dd>
          <HermesAttributionTag attribution={deposit.origin.attribution} />
        </dd>
        <dt>{t`Source`}</dt>
        <dd>
          {deposit.origin.source === null ? (
            <StyledMissing>{t`Not published`}</StyledMissing>
          ) : (
            sourceLabels[deposit.origin.source]
          )}
        </dd>
        <dt>{t`Company`}</dt>
        <dd>
          {isNonEmptyString(deposit.origin.structureId) ? (
            deposit.origin.structureId
          ) : (
            <StyledMissing>{t`Unknown`}</StyledMissing>
          )}
        </dd>
        <dt>{t`Received`}</dt>
        <dd>
          {isNonEmptyString(deposit.origin.receivedAt) ? (
            deposit.origin.receivedAt
          ) : (
            <StyledMissing>{t`Not an automatic reception`}</StyledMissing>
          )}
        </dd>
        <dt>{t`Contacts linked by qualification`}</dt>
        <dd>{i18n.number(deposit.linkedPersonIds.length)}</dd>
        <dt>{t`Companies linked by qualification`}</dt>
        <dd>{i18n.number(deposit.linkedCompanyIds.length)}</dd>
        <dt>{t`Duplicate rows`}</dt>
        <dd>{renderCount(deposit.counts.duplicate)}</dd>
        <dt>{t`Rows under opposition`}</dt>
        <dd>{renderCount(deposit.counts.suppressed)}</dd>
        <dt>{t`Rows needing review`}</dt>
        <dd>{renderCount(deposit.counts.conflict)}</dd>
      </StyledFacts>

      {deposit.isQualificationRequired === true && (
        <ProspectionNote>
          <Trans>
            Rows become contacts only when a human qualifies them. Arriving here
            qualifies nothing.
          </Trans>
        </ProspectionNote>
      )}

      {/* The deal statement, read from the server rather than assumed. */}
      {state.kind === 'classified' &&
        (state.automaticDealCreated === false ? (
          <ProspectionNote>
            <Trans>
              No opportunity was created by this reception. Any opportunity
              linked to these contacts already existed and was opened by
              someone.
            </Trans>
          </ProspectionNote>
        ) : state.automaticDealCreated === true ? (
          <ProspectionNote role="alert">
            <Trans>
              The server reports an opportunity created by this reception. No
              inbound path should open one: have this checked.
            </Trans>
          </ProspectionNote>
        ) : (
          <ProspectionNote role="alert">
            <Trans>
              The classification does not say whether an opportunity was
              created by this reception.
            </Trans>
          </ProspectionNote>
        ))}
    </>
  );

  const deposit =
    state.kind === 'classified'
      ? (state.deposits.find((entry) => entry.batchId === batchId) ?? null)
      : null;

  return (
    <Section.Root>
      <Section.Header
        title={t`Classification`}
        description={t`What the server knows about where this collection came from and what it already touches.`}
      />

      {state.kind === 'loading' && (
        <ProspectionNote>
          <Trans>Reading the classification…</Trans>
        </ProspectionNote>
      )}

      {/* An authorisation answer, never shown as a failure. */}
      {state.kind === 'denied' && (
        <ProspectionNote>
          <Trans>
            Your role does not allow reading the classification of receptions.
          </Trans>
        </ProspectionNote>
      )}

      {state.kind === 'unreadable' && (
        <ProspectionNote role="alert">
          <Trans>
            The classification could not be read. Nothing is assumed about this
            collection's origin.
          </Trans>
        </ProspectionNote>
      )}

      {/* Classified, but this collection is not among the deposits the server
          returned. An absence of classification is not an absence of
          provenance, so it says exactly that. */}
      {state.kind === 'classified' && deposit === null && (
        <ProspectionNote>
          <Trans>
            The server returned no classification for this collection.
          </Trans>
        </ProspectionNote>
      )}

      {deposit !== null && renderFacts(deposit)}
    </Section.Root>
  );
};
