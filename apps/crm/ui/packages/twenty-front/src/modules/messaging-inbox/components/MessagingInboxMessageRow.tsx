import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import {
  IconArrowDown,
  IconArrowUp,
  IconHelpCircle,
} from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxInstantLabel } from '@/messaging-inbox/components/MessagingInboxInstantLabel';
import { MessagingInboxMessageStatus } from '@/messaging-inbox/components/MessagingInboxMessageStatus';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { type MessagingInboxMessage } from '@/messaging-inbox/types/MessagingInboxMessage';

const StyledRow = styled.li`
  border-left: 2px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]} 0
    ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[2]};

  &[data-direction='outbound'] {
    border-left-color: ${themeCssVariables.accent.primary};
  }
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledDirection = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.sm};
  }
`;

const StyledTime = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

// Customer content. pre-wrap keeps the sender's own line breaks; anywhere
// stops one long token from pushing the pane sideways.
const StyledBody = styled.p`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

type MessagingInboxMessageRowProps = {
  message: MessagingInboxMessage;
};

// One message.
//
// Direction never rests on colour: it is written out ("Received", "Sent",
// "Direction unknown"), carries an arrow icon, and only then changes the left
// edge. The body is rendered as text — customer content is untrusted data,
// never markup and never an instruction.
export const MessagingInboxMessageRow = ({
  message,
}: MessagingInboxMessageRowProps) => {
  const { t } = useLingui();

  const { direction } = message;

  const directionLabel =
    direction.kind === 'inbound'
      ? t`Received`
      : direction.kind === 'outbound'
        ? t`Sent`
        : t`Direction unknown`;

  return (
    <StyledRow data-direction={direction.kind}>
      <StyledHeader>
        <StyledDirection>
          {direction.kind === 'inbound' && <IconArrowDown />}
          {direction.kind === 'outbound' && <IconArrowUp />}
          {direction.kind === 'unknown' && <IconHelpCircle />}
          {directionLabel}
        </StyledDirection>

        <StyledTime>
          <MessagingInboxInstantLabel value={message.occurredAt} />
        </StyledTime>

        <MessagingInboxMessageStatus
          status={message.status}
          errorCode={message.errorCode}
        />
      </StyledHeader>

      {isNonEmptyString(message.text) ? (
        <StyledBody>{message.text}</StyledBody>
      ) : (
        <MessagingInboxNote>
          <Trans>No text in this message.</Trans>
        </MessagingInboxNote>
      )}

      {/* The raw value the server sent for a direction this client cannot
          read. Shown so the gap is reportable, never interpreted. */}
      {direction.kind === 'unknown' && isNonEmptyString(direction.raw) && (
        <MessagingInboxNote>{direction.raw}</MessagingInboxNote>
      )}
    </StyledRow>
  );
};
