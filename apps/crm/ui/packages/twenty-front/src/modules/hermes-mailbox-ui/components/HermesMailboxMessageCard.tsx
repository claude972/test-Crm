import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  IconArrowDown,
  IconArrowUp,
  IconHelpCircle,
} from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxAttachmentStrip } from '@/hermes-mailbox-ui/components/HermesMailboxAttachmentStrip';
import { HermesMailboxBodyView } from '@/hermes-mailbox-ui/components/HermesMailboxBodyView';
import { HermesMailboxInstantLabel } from '@/hermes-mailbox-ui/components/HermesMailboxInstantLabel';
import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { type HermesMailboxInlineImage } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import { type HermesMailboxMessage } from '@/hermes-mailbox-ui/types/HermesMailboxMessage';
import { formatHermesMailboxAddress } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';

const StyledCard = styled.article`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-left: 2px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};

  &[data-direction='outbound'] {
    border-left-color: ${themeCssVariables.accent.primary};
  }
`;

const StyledHeader = styled.header`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-width: 0;
`;

const StyledAuthor = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StyledMeta = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-wrap: wrap;
  font-size: ${themeCssVariables.font.size.xs};
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

const StyledDraftBadge = styled.span`
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  padding: 0 ${themeCssVariables.spacing[1]};
  text-transform: uppercase;
`;

const StyledQuote = styled.details`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  min-width: 0;

  & > summary {
    cursor: pointer;
    padding: ${themeCssVariables.spacing[1]} 0;
  }

  & > summary:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

const StyledQuoteBody = styled.div`
  border-left: 2px solid ${themeCssVariables.border.color.strong};
  min-width: 0;
  padding-left: ${themeCssVariables.spacing[2]};
`;

type HermesMailboxMessageCardProps = {
  message: HermesMailboxMessage;
  // Embedded images the parent already resolved for this message.
  inlineImages?: HermesMailboxInlineImage[];
  // Performs the private read for one attachment. Absent means no download is
  // offered, whatever an attachment's availability says.
  onDownloadAttachment?: (attachmentId: string) => void;
};

// One message in the reading pane.
//
// Direction never rests on colour: it is written out, carries an arrow, and
// only then changes the left edge. An unsent draft carries its own badge, so
// nobody reads it as a reply that went out.
export const HermesMailboxMessageCard = ({
  message,
  inlineImages,
  onDownloadAttachment,
}: HermesMailboxMessageCardProps) => {
  const { t } = useLingui();

  const directionLabel =
    message.isOutbound === true
      ? t`Sent`
      : message.isOutbound === false
        ? t`Received`
        : t`Direction unknown`;

  const author =
    message.author === null
      ? t`No author given`
      : formatHermesMailboxAddress(message.author);

  return (
    <StyledCard
      data-direction={
        message.isOutbound === true
          ? 'outbound'
          : message.isOutbound === false
            ? 'inbound'
            : 'unknown'
      }
    >
      <StyledHeader>
        {/* Provider-sourced. Rendered as text: a display name is
            attacker-controlled in received mail. */}
        <StyledAuthor>{author}</StyledAuthor>

        <StyledMeta>
          <StyledDirection>
            {message.isOutbound === true && <IconArrowUp aria-hidden="true" />}
            {message.isOutbound === false && (
              <IconArrowDown aria-hidden="true" />
            )}
            {message.isOutbound === null && (
              <IconHelpCircle aria-hidden="true" />
            )}
            {directionLabel}
          </StyledDirection>

          <HermesMailboxInstantLabel value={message.occurredAt} />
        </StyledMeta>
      </StyledHeader>

      {message.isUnsentDraft && (
        <HermesMailboxNote role="status">
          <StyledDraftBadge>{t`Draft`}</StyledDraftBadge>{' '}
          <Trans>Saved here and never sent.</Trans>
        </HermesMailboxNote>
      )}

      <HermesMailboxBodyView body={message.body} inlineImages={inlineImages} />

      {message.quote !== null && (
        <StyledQuote>
          <summary>{t`Show the quoted message`}</summary>
          <StyledQuoteBody>
            {/* A quote is received content too: same path, same rules. */}
            <HermesMailboxBodyView
              body={message.quote}
              inlineImages={inlineImages}
            />
          </StyledQuoteBody>
        </StyledQuote>
      )}

      <HermesMailboxAttachmentStrip
        title={t`Attachments`}
        attachments={message.attachments}
        onDownloadAttachment={onDownloadAttachment}
      />
    </StyledCard>
  );
};
