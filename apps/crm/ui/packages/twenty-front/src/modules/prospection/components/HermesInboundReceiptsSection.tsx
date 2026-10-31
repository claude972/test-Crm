import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { Section } from 'kovaa-lab-ui/components/layout';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';
import { HermesAttributionTag } from '@/prospection/components/HermesAttributionTag';
import { HermesInboundReceiptInspection } from '@/prospection/components/HermesInboundReceiptInspection';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { type HermesInboundReceipt } from '@/prospection/types/HermesInboundClassification';
import { useHermesInboundReceipts } from '@/prospection/hooks/useHermesInboundReceipts';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

// The identifier column is the widest: an operator matches it character by
// character against the provider console, so it is never truncated.
const HERMES_RECEIPTS_GRID_TEMPLATE_COLUMNS =
  'minmax(0, 0.8fr) minmax(0, 2fr) minmax(0, 1.3fr) minmax(0, 1.1fr) minmax(0, 0.6fr)';

const StyledIdentifier = styled.span`
  color: ${themeCssVariables.font.color.primary};
  overflow-wrap: anywhere;
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

const StyledInspection = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[3]};
`;

// The bridge receipts this company holds — HeyForm answers and Cal.diy
// bookings — each with the canonical identifier its provider console shows,
// and an inspection that asks the server how it classified the one picked.
//
// WHAT THIS SECTION REFUSES TO IMPLY. An empty page is not "no receipt was
// ever received": a receipt edited until it lost its marker is found by no
// list read, and a capped page is a prefix. Both are said in words. The time
// shown is when we asked, not a claim that the page is still true now.
export const HermesInboundReceiptsSection = () => {
  const { t, i18n } = useLingui();

  const state = useHermesInboundReceipts();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const providerLabels: Record<string, string> = {
    HEYFORM: t`Form`,
    CAL_DIY: t`Booking`,
  };

  const selected: HermesInboundReceipt | null =
    state.kind === 'listed'
      ? (state.receipts.find(
          (receipt) =>
            isNonEmptyString(receipt.noteId) &&
            receipt.noteId === selectedNoteId,
        ) ?? null)
      : null;

  const renderReceivedAt = (receipt: HermesInboundReceipt) => {
    // Three cases, not two: a date the payload did not carry and a date that
    // cannot be read are different answers, and formatting an Invalid Date
    // throws a RangeError that would take the whole table down.
    const reported = parseConnectorCheckedAt(receipt.receivedAt);

    if (reported.kind === 'never') {
      return <StyledMissing>{t`Not published`}</StyledMissing>;
    }

    if (reported.kind === 'unreadable') {
      return <StyledMissing>{t`Unreadable date`}</StyledMissing>;
    }

    return i18n.date(reported.date, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <Section.Root>
      <Section.Header
        title={t`Bridge receipts`}
        description={t`Form answers and bookings received through a signed connection, each with the identifier its provider console shows.`}
      />

      {state.kind === 'loading' && (
        <ProspectionNote>
          <Trans>Reading the receipts…</Trans>
        </ProspectionNote>
      )}

      {/* An authorisation answer, never shown as a failure. */}
      {state.kind === 'denied' && (
        <ProspectionNote>
          <Trans>Your role does not allow reading the bridge receipts.</Trans>
        </ProspectionNote>
      )}

      {/* A fact the server stated, naming exactly what to configure. */}
      {state.kind === 'not-configured' && (
        <ProspectionNote>
          <Trans>
            No signed connection grants Forms or Calendar for this company, so
            no receipt could be attributed and none was read. Configure an
            intake connection for Forms or Calendar in the connections
            settings.
          </Trans>
        </ProspectionNote>
      )}

      {state.kind === 'unreadable' && (
        <HermesPayloadProblemNote
          problem={state.problem}
          subject={t`Bridge receipts`}
        />
      )}

      {state.kind === 'listed' && (
        <>
          {state.receipts.length === 0 ? (
            <ProspectionNote>
              <Trans>
                No receipt is listed for this company. A receipt whose body no
                longer carries its marker is found by no list read, so this is
                not proof that none was ever received.
              </Trans>
            </ProspectionNote>
          ) : (
            <Table>
              <TableRow
                gridTemplateColumns={HERMES_RECEIPTS_GRID_TEMPLATE_COLUMNS}
              >
                <TableHeader>{t`Kind`}</TableHeader>
                <TableHeader>{t`Event identifier`}</TableHeader>
                <TableHeader>{t`Attribution`}</TableHeader>
                <TableHeader>{t`Reported`}</TableHeader>
                <TableHeader>{t`Inspect`}</TableHeader>
              </TableRow>
              <TableBody>
                {state.receipts.map((receipt, index) => (
                  <TableRow
                    key={receipt.noteId ?? `receipt-${index}`}
                    gridTemplateColumns={
                      HERMES_RECEIPTS_GRID_TEMPLATE_COLUMNS
                    }
                  >
                    <TableCell overflow="hidden">
                      {receipt.provider === null ? (
                        <StyledMissing>{t`Unknown provider`}</StyledMissing>
                      ) : (
                        providerLabels[receipt.provider]
                      )}
                    </TableCell>
                    {/* The canonical identifier, whole: an operator has to be
                        able to match it against the provider's own console. */}
                    <TableCell>
                      {isNonEmptyString(receipt.eventId) ? (
                        <StyledIdentifier>{receipt.eventId}</StyledIdentifier>
                      ) : (
                        <StyledMissing>{t`Not published`}</StyledMissing>
                      )}
                    </TableCell>
                    <TableCell>
                      <HermesAttributionTag
                        attribution={receipt.attribution}
                      />
                    </TableCell>
                    <TableCell overflow="hidden">
                      {renderReceivedAt(receipt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isNonEmptyString(receipt.noteId)}
                        onClick={() =>
                          setSelectedNoteId(receipt.noteId ?? null)
                        }
                      >
                        {t`Inspect`}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* A capped page is a prefix. Said rather than presented as the
              whole surface. */}
          {state.truncated === true && (
            <ProspectionNote role="alert">
              {state.cap === null
                ? t`More receipts exist than are listed here.`
                : t`Only the ${i18n.number(state.cap)} most recent receipts are listed; more exist.`}
            </ProspectionNote>
          )}

          {state.truncated === null && (
            <ProspectionNote role="alert">
              <Trans>
                The server did not say whether this page is complete, so it is
                not presented as the whole set.
              </Trans>
            </ProspectionNote>
          )}

          {/* When we asked, not a claim that it is still true now. */}
          {isNonEmptyString(state.checkedAt) && (
            <ProspectionNote>
              {t`Asked at ${state.checkedAt}. Nothing since then is reflected here.`}
            </ProspectionNote>
          )}

          {selected !== null && (
            <StyledInspection>
              <HermesInboundReceiptInspection receipt={selected} />
            </StyledInspection>
          )}
        </>
      )}
    </Section.Root>
  );
};
