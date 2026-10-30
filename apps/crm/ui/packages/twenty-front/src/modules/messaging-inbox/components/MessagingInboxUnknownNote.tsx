import { Trans } from '@lingui/react/macro';

import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { type MessagingInboxPayloadProblem } from '@/messaging-inbox/types/MessagingInboxPage';

type MessagingInboxUnknownNoteProps = {
  // Already translated by the caller, so each surface keeps its own short
  // sentence instead of one message built around a variable.
  headline: string;
  problem: MessagingInboxPayloadProblem | null;
};

// The headline for a surface that could not be read. It says unavailable,
// never "none": an operation the schema does not expose yet and an inbox with
// nothing in it are not the same fact, and only one of them is good news.
export const MessagingInboxUnknownNote = ({
  headline,
  problem,
}: MessagingInboxUnknownNoteProps) => (
  <>
    <MessagingInboxNote role="alert">{headline}</MessagingInboxNote>
    {problem === 'malformed' && (
      <MessagingInboxNote>
        <Trans>The answer did not match the contract.</Trans>
      </MessagingInboxNote>
    )}
  </>
);
