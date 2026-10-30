import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextInstant } from '@/client-context/components/ClientContextInstant';
import {
  CLIENT_CONTEXT_BOOKINGS_SOURCE,
  CLIENT_CONTEXT_FORMS_SOURCE,
  CLIENT_CONTEXT_NOTES_SOURCE,
} from '@/client-context/constants/ClientContextSources';
import { type ClientBooking } from '@/client-context/types/ClientBooking';
import { type ClientContextEntryKind } from '@/client-context/types/ClientContextEntry';
import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
import { type ClientRecordNote } from '@/client-context/types/ClientRecordNote';
import { buildClientContextEntries } from '@/client-context/utils/buildClientContextEntries';
import { readClientContextSourceName } from '@/client-context/utils/readClientContextSourceName';
import { ConnectorSyncTag } from '@/connectors/components/ConnectorSyncTag';
import {
  ProspectionCounters,
  type ProspectionCounter,
} from '@/prospection/components/ProspectionCounters';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { SettingsEmptyPlaceholder } from '@/settings/components/SettingsEmptyPlaceholder';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

const CLIENT_CONTEXT_GRID_TEMPLATE_COLUMNS =
  'minmax(0, 1.1fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.2fr)';

const StyledPrimary = styled.span`
  color: ${themeCssVariables.font.color.primary};
  overflow-wrap: anywhere;
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
  overflow-wrap: anywhere;
`;

type ClientContextTimelineSectionProps = {
  formResponses: ClientContextSourceState<ClientFormResponse>;
  bookings: ClientContextSourceState<ClientBooking>;
  notes: ClientContextSourceState<ClientRecordNote>;
};

// The client's chronology, merged from the sources that answered.
//
// It holds received items only. A source that could not contribute is named
// below the table rather than left out silently: a chronology missing a source
// is an incomplete chronology, not a quiet client.
export const ClientContextTimelineSection = ({
  formResponses,
  bookings,
  notes,
}: ClientContextTimelineSectionProps) => {
  const { t } = useLingui();

  const { entries, entryCount, unreadSourceKinds } = buildClientContextEntries({
    formResponses,
    bookings,
    notes,
  });

  const sourceNames: Record<ClientContextEntryKind, string> = {
    'form-response': CLIENT_CONTEXT_FORMS_SOURCE.name,
    booking: CLIENT_CONTEXT_BOOKINGS_SOURCE.name,
    note: CLIENT_CONTEXT_NOTES_SOURCE.name,
  };

  const kindLabels: Record<ClientContextEntryKind, string> = {
    'form-response': t`Form response`,
    booking: t`Appointment`,
    note: t`Recorded action`,
  };

  const counters: ProspectionCounter[] = [
    { key: 'entries', label: t`Entries`, count: entryCount },
  ];

  const missingSources = unreadSourceKinds
    .map((kind) => sourceNames[kind])
    .join(' · ');

  return (
    <Section.Root>
      <Section.Header
        title={t`Client chronology`}
        description={t`Form responses, appointments and recorded actions actually received for this client, newest first.`}
      />
      <ProspectionCounters counters={counters} />

      {/* Attributable, so the reader knows which part of the chronology is
          missing rather than that something is. */}
      {unreadSourceKinds.length > 0 && (
        <ProspectionNote role="alert">
          {t`Incomplete chronology. Sources that did not contribute: ${missingSources}.`}
        </ProspectionNote>
      )}

      {entries.length === 0 ? (
        unreadSourceKinds.length > 0 ? (
          <ProspectionNote>
            <Trans>
              Nothing can be listed until at least one source answers.
            </Trans>
          </ProspectionNote>
        ) : (
          <SettingsEmptyPlaceholder>
            <Trans>Nothing received for this client yet.</Trans>
          </SettingsEmptyPlaceholder>
        )
      ) : (
        <Table>
          <TableRow gridTemplateColumns={CLIENT_CONTEXT_GRID_TEMPLATE_COLUMNS}>
            <TableHeader>{t`When`}</TableHeader>
            <TableHeader>{t`Entry`}</TableHeader>
            <TableHeader>{t`Source`}</TableHeader>
            <TableHeader>{t`Sync`}</TableHeader>
          </TableRow>
          <TableBody>
            {entries.map((entry) => {
              const sourceName = readClientContextSourceName(entry.provenance);

              return (
                <TableRow
                  key={entry.key}
                  gridTemplateColumns={CLIENT_CONTEXT_GRID_TEMPLATE_COLUMNS}
                >
                  <TableCell overflow="hidden">
                    {/* An undated entry says so. It is never dated from the
                        position it was given in the list. */}
                    <ClientContextInstant
                      value={entry.occurredAt}
                      absentLabel={t`Date unknown`}
                    />
                  </TableCell>
                  <TableCell overflow="hidden">
                    {isNonEmptyString(entry.title) ? (
                      <StyledPrimary title={kindLabels[entry.kind]}>
                        {entry.title}
                      </StyledPrimary>
                    ) : (
                      <StyledMissing>{kindLabels[entry.kind]}</StyledMissing>
                    )}
                  </TableCell>
                  <TableCell overflow="hidden">
                    {isNonEmptyString(sourceName) ? (
                      <span title={entry.provenance.externalId ?? undefined}>
                        {sourceName}
                      </span>
                    ) : (
                      <StyledMissing>{t`Not attributed`}</StyledMissing>
                    )}
                  </TableCell>
                  <TableCell overflow="hidden">
                    <ConnectorSyncTag
                      status={entry.syncStatus}
                      reason={entry.syncReason ?? undefined}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Section.Root>
  );
};
