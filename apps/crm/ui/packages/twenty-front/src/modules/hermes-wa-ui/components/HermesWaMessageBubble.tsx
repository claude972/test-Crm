import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type ReactNode } from 'react';
import { VisuallyHidden } from 'kovaa-lab-ui/primitives/accessibility';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesWaDeliveryLabel } from '@/hermes-wa-ui/components/HermesWaDeliveryLabel';
import { useHermesWaMediaKindLabel } from '@/hermes-wa-ui/hooks/useHermesWaMediaKindLabel';
import { type HermesWaDelivery } from '@/hermes-wa-ui/types/HermesWaDelivery';
import { type HermesWaDirection } from '@/hermes-wa-ui/types/HermesWaDirection';
import { type HermesWaQuote } from '@/hermes-wa-ui/types/HermesWaQuote';

const StyledRow = styled.div`
  display: flex;
  justify-content: flex-start;
  min-width: 0;

  &[data-direction='outbound'] {
    justify-content: flex-end;
  }
`;

// 78% of the pane, so the opposite side always shows and the alignment stays
// legible. It widens at phone width, where 78% leaves too narrow a column.
const StyledBubble = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  max-width: 78%;
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  /* The clipped corner points at the speaker: decoration on top of the
     alignment, not the signal itself. */
  &[data-direction='inbound'] {
    border-bottom-left-radius: ${themeCssVariables.border.radius.xs};
  }

  &[data-direction='outbound'] {
    background: ${themeCssVariables.background.transparent.blue};
    border-bottom-right-radius: ${themeCssVariables.border.radius.xs};
    border-color: ${themeCssVariables.border.color.blue};
  }

  &[data-direction='unknown'] {
    border-color: ${themeCssVariables.border.color.strong};
    border-style: dashed;
  }

  @media (max-width: 480px) {
    max-width: 92%;
  }
`;

const StyledTopLine = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledAuthor = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  overflow-wrap: anywhere;
`;

// Two words, a border, then a tint: the unread mark never rests on colour.
const StyledUnreadMark = styled.span`
  border: 1px solid ${themeCssVariables.border.color.blue};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  padding: 0 ${themeCssVariables.spacing[1]};
  text-transform: uppercase;
  white-space: nowrap;
`;

const StyledUnknownDirectionMark = styled.span`
  border: 1px dashed ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xxs};
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledQuote = styled.blockquote`
  background: ${themeCssVariables.background.transparent.light};
  border-left: 3px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  gap: 2px;
  margin: 0;
  min-width: 0;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

// Clamped to three lines so a long quote does not bury the reply. The full
// text stays in the DOM: nothing is cut from the string itself.
const StyledQuoteText = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  display: -webkit-box;
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  white-space: pre-wrap;
`;

// Customer content. pre-wrap keeps the sender's own line breaks; anywhere
// stops one long token from pushing the thread sideways.
const StyledText = styled.p`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

// Time and delivery state live inside the bubble, bottom right: the grammar
// this thread borrows.
const StyledMeta = styled.div`
  align-items: baseline;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-wrap: wrap;
  font-size: ${themeCssVariables.font.size.xxs};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  min-width: 0;
`;

const StyledTime = styled.span`
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const StyledMediaSlot = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

type HermesWaMessageBubbleProps = {
  direction: HermesWaDirection;
  // A sender's own name, or a label the caller chose for an automatic reply.
  // Untrusted text.
  authorLabel?: string | null;
  // Customer content, rendered as text and never as markup.
  text?: string | null;
  // Already formatted: formatting needs a locale and a time zone this
  // component is not given.
  timeLabel?: string | null;
  delivery?: HermesWaDelivery | null;
  quote?: HermesWaQuote | null;
  isUnread?: boolean;
  // The media slot, at full bubble width.
  children?: ReactNode;
};

// One message in a WhatsApp-style thread. What makes it read that way is the
// grammar, not a logo: the side it sits on, the clipped corner, the time and
// state inside the bubble, media at the bubble's width.
//
// A screen reader gets "Sent" or "Received" before the content, so the layout
// is not the only place the direction exists. A direction this client cannot
// read is laid out on the incoming side and marked: the workspace's side
// would attribute a customer's words to the workspace.
export const HermesWaMessageBubble = ({
  direction,
  authorLabel = null,
  text = null,
  timeLabel = null,
  delivery = null,
  quote = null,
  isUnread = false,
  children,
}: HermesWaMessageBubbleProps) => {
  const { t } = useLingui();

  const quotedKindLabel = useHermesWaMediaKindLabel(quote?.mediaKind);

  const directionLabel =
    direction.kind === 'inbound'
      ? t`Received`
      : direction.kind === 'outbound'
        ? t`Sent`
        : t`Direction unknown`;

  const author = authorLabel?.trim();
  const quoteAuthor = quote?.authorLabel?.trim();
  const hasText = isNonEmptyString(text?.trim());
  const hasQuoteText = isNonEmptyString(quote?.text?.trim());
  const hasMedia = children !== undefined && children !== null;

  return (
    <StyledRow data-direction={direction.kind}>
      <StyledBubble data-direction={direction.kind}>
        <VisuallyHidden>{directionLabel}</VisuallyHidden>

        {(isNonEmptyString(author) ||
          isUnread ||
          direction.kind === 'unknown') && (
          <StyledTopLine>
            {isNonEmptyString(author) && <StyledAuthor>{author}</StyledAuthor>}

            {isUnread && <StyledUnreadMark>{t`Unread`}</StyledUnreadMark>}

            {direction.kind === 'unknown' && (
              <StyledUnknownDirectionMark>
                {/* The server's own word when there was one, so the gap is
                    reportable. Not interpreted. */}
                {isNonEmptyString(direction.raw)
                  ? t`Direction unknown: ${direction.raw}`
                  : t`Direction unknown`}
              </StyledUnknownDirectionMark>
            )}
          </StyledTopLine>
        )}

        {/* A reply can quote a message this client never loaded. An empty
            strip there would read as an empty message from the other party. */}
        {quote !== null && (
          <StyledQuote>
            <StyledAuthor>
              {isNonEmptyString(quoteAuthor) ? quoteAuthor : t`Sender unknown`}
            </StyledAuthor>
            <StyledQuoteText>
              {hasQuoteText
                ? quote.text
                : (quotedKindLabel ?? t`Quoted message not available`)}
            </StyledQuoteText>
          </StyledQuote>
        )}

        {hasMedia && <StyledMediaSlot>{children}</StyledMediaSlot>}

        {hasText ? (
          <StyledText>{text}</StyledText>
        ) : (
          // An empty bubble would read as a message that was never written.
          !hasMedia && <StyledText>{t`No content in this message.`}</StyledText>
        )}

        <StyledMeta>
          <StyledTime>
            {isNonEmptyString(timeLabel?.trim()) ? timeLabel : t`Time unknown`}
          </StyledTime>

          {delivery !== null && <HermesWaDeliveryLabel delivery={delivery} />}
        </StyledMeta>
      </StyledBubble>
    </StyledRow>
  );
};
