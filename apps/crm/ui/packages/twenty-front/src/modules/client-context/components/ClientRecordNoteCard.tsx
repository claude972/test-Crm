import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextInstant } from '@/client-context/components/ClientContextInstant';
import { ClientContextItemCard } from '@/client-context/components/ClientContextItemCard';
import { CLIENT_CONTEXT_NOTES_SOURCE } from '@/client-context/constants/ClientContextSources';
import { type ClientRecordNote } from '@/client-context/types/ClientRecordNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';

const StyledMeta = styled.dl`
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

// The body as plain text, with its line breaks kept. Never markup: see
// ClientRecordNote.
const StyledBody = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

type ClientRecordNoteCardProps = {
  note: ClientRecordNote;
};

// One recorded action attached to the client record through the native Note
// object. The body is rendered as text and never as markup, so a received
// body cannot inject anything into the record page.
export const ClientRecordNoteCard = ({ note }: ClientRecordNoteCardProps) => {
  const { t } = useLingui();

  return (
    <ClientContextItemCard
      Icon={CLIENT_CONTEXT_NOTES_SOURCE.Icon}
      title={note.title}
      untitledLabel={t`Untitled note`}
      syncStatus={note.syncStatus}
      syncReason={note.syncReason}
      provenance={note.provenance}
      fallbackSourceName={CLIENT_CONTEXT_NOTES_SOURCE.name}
    >
      <StyledMeta>
        <dt>{t`Recorded`}</dt>
        <dd>
          <ClientContextInstant value={note.createdAt} />
        </dd>
        {/* Shown only when it differs from the recording instant, so an
            untouched note does not carry a redundant row. */}
        {isNonEmptyString(note.updatedAt) &&
          note.updatedAt !== note.createdAt && (
            <>
              <dt>{t`Edited`}</dt>
              <dd>
                <ClientContextInstant value={note.updatedAt} />
              </dd>
            </>
          )}
      </StyledMeta>

      {note.bodyPreview === null ? (
        // An unreadable body is an unknown body, never an empty note.
        <ProspectionNote role="alert">
          <Trans>Body unreadable for this note.</Trans>
        </ProspectionNote>
      ) : note.bodyPreview.trim().length === 0 ? (
        <ProspectionNote>
          <Trans>Empty body.</Trans>
        </ProspectionNote>
      ) : (
        <StyledBody>{note.bodyPreview}</StyledBody>
      )}
    </ClientContextItemCard>
  );
};
