import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconHelpCircle, IconRefresh } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxContactLink } from '@/messaging-inbox/components/MessagingInboxContactLink';
import { MessagingInboxDiagnostic } from '@/messaging-inbox/components/MessagingInboxDiagnostic';
import { MessagingInboxInstantLabel } from '@/messaging-inbox/components/MessagingInboxInstantLabel';
import { MessagingInboxLoadMore } from '@/messaging-inbox/components/MessagingInboxLoadMore';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { MessagingInboxUnknownNote } from '@/messaging-inbox/components/MessagingInboxUnknownNote';
import { type MessagingInboxCursorList } from '@/messaging-inbox/hooks/useMessagingInboxCursorList';
import {
  channelHasSubject,
  type MessagingInboxChannel,
} from '@/messaging-inbox/types/MessagingInboxChannel';
import { type MessagingInboxConversation } from '@/messaging-inbox/types/MessagingInboxConversation';

const StyledPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 0;
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledPaneHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledPaneTitle = styled.h2`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledList = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
`;

const StyledItem = styled.li`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]};
`;

// Selection shows up three ways at once, so it holds without colour:
// aria-current for assistive technology, a thicker left edge, and a heavier
// handle.
const StyledSelect = styled.button`
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  display: grid;
  font-family: inherit;
  gap: ${themeCssVariables.spacing[0.5]};
  margin: 0;
  min-width: 0;
  padding: 0 0 0 ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;

  &[aria-current='true'] {
    border-left-color: ${themeCssVariables.accent.primary};
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

const StyledHandle = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow-wrap: anywhere;

  [aria-current='true'] & {
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledSubject = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow-wrap: anywhere;
`;

const StyledMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledItemAside = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type MessagingInboxConversationListProps = {
  channel: MessagingInboxChannel;
  list: MessagingInboxCursorList<MessagingInboxConversation>;
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
};

export const MessagingInboxConversationList = ({
  channel,
  list,
  selectedConversationId,
  onSelect,
}: MessagingInboxConversationListProps) => {
  const { t } = useLingui();

  const showsSubject = channelHasSubject(channel);

  const header = (
    <StyledPaneHeader>
      <StyledPaneTitle>{t`Conversations`}</StyledPaneTitle>
      {/* The only refresh there is. No polling and no subscription: this
          screen never claims a live feed the contract does not provide. */}
      <Button
        variant="outline"
        size="sm"
        startIcon={<IconRefresh />}
        loading={list.status === 'loading'}
        onClick={list.reload}
      >
        {t`Refresh`}
      </Button>
    </StyledPaneHeader>
  );

  if (list.status === 'loading') {
    return (
      <StyledPane>
        {header}
        <MessagingInboxNote>
          <Trans>Loading…</Trans>
        </MessagingInboxNote>
      </StyledPane>
    );
  }

  if (list.status === 'denied') {
    return (
      <StyledPane>
        {header}
        <MessagingInboxNote role="alert">
          <Trans>Not authorised to read this inbox.</Trans>
        </MessagingInboxNote>
        <MessagingInboxDiagnostic message={list.failureMessage} />
      </StyledPane>
    );
  }

  // Unavailable, never empty: an operation the deployment does not expose and
  // an inbox with nothing in it are different facts.
  if (list.status === 'unreadable') {
    return (
      <StyledPane>
        {header}
        <MessagingInboxUnknownNote
          headline={t`Conversations unavailable.`}
          problem={list.problem}
        />
        <MessagingInboxDiagnostic message={list.failureMessage} />
      </StyledPane>
    );
  }

  return (
    <StyledPane>
      {header}

      {list.unreadableItemCount > 0 && (
        <MessagingInboxNote role="alert">
          <Trans>Some conversations could not be read and are not listed.</Trans>
        </MessagingInboxNote>
      )}

      {list.items.length === 0 ? (
        <MessagingInboxNote>
          <Trans>No conversation on this channel.</Trans>
        </MessagingInboxNote>
      ) : (
        <StyledList>
          {list.items.map((conversation) => {
            const isSelected = conversation.id === selectedConversationId;

            return (
              <StyledItem key={conversation.id}>
                <StyledSelect
                  type="button"
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => onSelect(conversation.id)}
                >
                  {/* Provider-sourced handle. Rendered as text. */}
                  <StyledHandle>
                    {isNonEmptyString(conversation.contactHandle)
                      ? conversation.contactHandle
                      : t`No handle given`}
                  </StyledHandle>

                  {/* Subject belongs to the email channel only. A WhatsApp
                      conversation has none, so no empty line stands in for
                      it. */}
                  {showsSubject && (
                    <StyledSubject>
                      {isNonEmptyString(conversation.subject)
                        ? conversation.subject
                        : t`No subject`}
                    </StyledSubject>
                  )}

                  <StyledMeta>
                    <MessagingInboxInstantLabel
                      value={conversation.lastMessageAt}
                    />
                  </StyledMeta>
                </StyledSelect>

                <StyledItemAside>
                  <MessagingInboxContactLink
                    personId={conversation.personId}
                    personMatchStatus={conversation.personMatchStatus}
                  />

                  {conversation.channel === null && (
                    <Tag
                      color="gray"
                      variant="outline"
                      borderStyle="dashed"
                      truncate={false}
                      startIcon={<IconHelpCircle />}
                    >
                      {t`Channel unknown`}
                    </Tag>
                  )}
                </StyledItemAside>
              </StyledItem>
            );
          })}
        </StyledList>
      )}

      <MessagingInboxLoadMore list={list} />
    </StyledPane>
  );
};
