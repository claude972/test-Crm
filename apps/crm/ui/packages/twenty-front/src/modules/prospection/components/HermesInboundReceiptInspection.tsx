import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAttributionTag } from '@/prospection/components/HermesAttributionTag';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { useHermesInboundItemClassification } from '@/prospection/hooks/useHermesInboundItemClassification';
import {
  type HermesInboundItem,
  type HermesInboundReceipt,
  type HermesInboundSource,
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

type HermesInboundReceiptInspectionProps = {
  // The receipt the operator picked. Null renders nothing: an inspection with
  // nothing selected must not read as a classification that came back empty.
  receipt: HermesInboundReceipt | null;
};

// How the server classified the one receipt on screen: which signed
// connection it is attributable to, which company it belongs to, and what it
// already touches in the CRM.
//
// THE TWO THINGS THIS PANEL MUST NEVER SAY. A linked opportunity listed here
// already pointed at the contact: no inbound path opens a deal, and the server
// attests that on every answer rather than the screen assuming it. And a
// booking's calendar record is NOT reported as absent — the receipt does not
// store the booking identifier, so the server was never asked for it.
export const HermesInboundReceiptInspection = ({
  receipt,
}: HermesInboundReceiptInspectionProps) => {
  const { t } = useLingui();

  const provider = receipt?.provider ?? null;
  const eventId = receipt?.eventId ?? null;

  // The hook skips until both required identifiers are present, so a receipt
  // this build cannot address never asks the server to classify nothing.
  const inspectable = isNonEmptyString(provider) && isNonEmptyString(eventId);

  const state = useHermesInboundItemClassification(
    inspectable ? { provider, eventId } : null,
  );

  const sourceLabels: Record<HermesInboundSource, string> = {
    forms: t`Form answer`,
    calendar: t`Booking`,
    scraping: t`Scraping deposit`,
  };

  const renderFacts = (item: HermesInboundItem) => (
    <>
      <StyledFacts>
        <dt>{t`Attribution`}</dt>
        <dd>
          <HermesAttributionTag attribution={item.origin.attribution} />
        </dd>
        <dt>{t`Source`}</dt>
        <dd>
          {item.origin.source === null ? (
            <StyledMissing>{t`Not published`}</StyledMissing>
          ) : (
            sourceLabels[item.origin.source]
          )}
        </dd>
        <dt>{t`Event identifier`}</dt>
        <dd>
          {isNonEmptyString(item.origin.eventId) ? (
            item.origin.eventId
          ) : (
            <StyledMissing>{t`Not published`}</StyledMissing>
          )}
        </dd>
        <dt>{t`Signed connection`}</dt>
        <dd>
          {isNonEmptyString(item.origin.connectionId) ? (
            item.origin.connectionId
          ) : (
            <StyledMissing>{t`No signed connection accounts for it`}</StyledMissing>
          )}
        </dd>
        <dt>{t`Company`}</dt>
        <dd>
          {isNonEmptyString(item.origin.structureId) ? (
            item.origin.structureId
          ) : (
            <StyledMissing>{t`Unknown`}</StyledMissing>
          )}
        </dd>
        <dt>{t`Reported by the provider`}</dt>
        <dd>
          {isNonEmptyString(item.origin.receivedAt) ? (
            item.origin.receivedAt
          ) : (
            <StyledMissing>{t`Not published`}</StyledMissing>
          )}
        </dd>
        <dt>{t`Contact`}</dt>
        <dd>
          {item.isContactLinked
            ? t`Linked`
            : t`Not linked to a contact`}
        </dd>
        <dt>{t`Record`}</dt>
        <dd>
          {isNonEmptyString(item.links.noteId) ? (
            item.links.noteId
          ) : (
            <StyledMissing>{t`Not published`}</StyledMissing>
          )}
        </dd>
        <dt>{t`Opportunities already pointing at this contact`}</dt>
        <dd>{item.links.existingOpportunityIds.length}</dd>
      </StyledFacts>

      {/* The booking record, said as unasked rather than as absent. The
          receipt does not store the booking identifier, so this inspection
          cannot ask for the calendar record and must not imply there is none. */}
      {provider === 'CAL_DIY' && (
        <ProspectionNote>
          <Trans>
            The booking record is not reported here: the receipt does not store
            the booking identifier, so it was never asked for. This is not a
            booking without a calendar entry.
          </Trans>
        </ProspectionNote>
      )}

      {/* The deal statement, read from the server rather than assumed. */}
      {item.automaticDealCreated === false ? (
        <ProspectionNote>
          <Trans>
            No opportunity was created by this reception. Any opportunity
            linked to this contact already existed and was opened by someone.
          </Trans>
        </ProspectionNote>
      ) : item.automaticDealCreated === true ? (
        <ProspectionNote role="alert">
          <Trans>
            The server reports an opportunity created by this reception. No
            inbound path should open one: have this checked.
          </Trans>
        </ProspectionNote>
      ) : (
        <ProspectionNote role="alert">
          <Trans>
            The classification does not say whether an opportunity was created
            by this reception.
          </Trans>
        </ProspectionNote>
      )}
    </>
  );

  if (receipt === null) {
    return null;
  }

  // Listed, but not addressable: the stored receipt does not carry a provider
  // and an event identifier this build can send. Said rather than shown as a
  // classification that came back empty.
  if (!inspectable) {
    return (
      <ProspectionNote role="alert">
        <Trans>
          This receipt cannot be inspected: it does not carry both a known
          provider and an event identifier.
        </Trans>
      </ProspectionNote>
    );
  }

  if (state.kind === 'loading') {
    return (
      <ProspectionNote>
        <Trans>Reading the classification…</Trans>
      </ProspectionNote>
    );
  }

  // An authorisation answer, never shown as a failure.
  if (state.kind === 'denied') {
    return (
      <ProspectionNote>
        <Trans>
          Your role does not allow reading the classification of receptions.
        </Trans>
      </ProspectionNote>
    );
  }

  // A fact the server stated, naming what to configure.
  if (state.kind === 'not-configured') {
    return (
      <ProspectionNote>
        <Trans>
          No signed connection grants this source for this company, so the
          receipt cannot be classified. Configure an intake connection for
          Forms or Calendar in the connections settings.
        </Trans>
      </ProspectionNote>
    );
  }

  // Also a fact: this receipt is unknown to this company. Not an error.
  if (state.kind === 'not-found') {
    return (
      <ProspectionNote>
        <Trans>
          The server does not know this receipt for this company. It may have
          been removed since the list was read.
        </Trans>
      </ProspectionNote>
    );
  }

  if (state.kind === 'unreadable') {
    return (
      <HermesPayloadProblemNote
        problem={state.problem}
        subject={t`Receipt classification`}
      />
    );
  }

  return renderFacts(state.item);
};
