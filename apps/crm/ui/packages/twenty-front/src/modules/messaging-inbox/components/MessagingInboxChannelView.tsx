import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { IconArrowLeft } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';
import { useIsMobile } from 'kovaa-lab-ui/utilities';

import { MessagingInboxConnectionNote } from '@/messaging-inbox/components/MessagingInboxConnectionNote';
import { MessagingInboxConversationList } from '@/messaging-inbox/components/MessagingInboxConversationList';
import { MessagingInboxEmailSyncPanel } from '@/messaging-inbox/components/MessagingInboxEmailSyncPanel';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { MessagingInboxThread } from '@/messaging-inbox/components/MessagingInboxThread';
import { useMessagingInboxConnections } from '@/messaging-inbox/hooks/useMessagingInboxConnections';
import { useMessagingInboxConversations } from '@/messaging-inbox/hooks/useMessagingInboxConversations';
import { type MessagingInboxChannel } from '@/messaging-inbox/types/MessagingInboxChannel';

const StyledView = styled.div`
  display: grid;
  gap: 0;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  min-height: 0;
  min-width: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledListPane = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    border-right: none;
  }
`;

const StyledThreadPane = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledPlaceholder = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  justify-items: start;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledChannelHeader = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  justify-items: start;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[3]} 0;
`;

type MessagingInboxChannelViewProps = {
  channel: MessagingInboxChannel;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onClearConversation: () => void;
};

// One channel's inbox: its conversations on the left, the opened thread on
// the right. On a phone the two share the one column and the thread replaces
// the list, with an explicit way back.
//
// Mounted under a key tied to the channel, so switching tabs starts a clean
// read rather than mixing two channels in one list.
export const MessagingInboxChannelView = ({
  channel,
  selectedConversationId,
  onSelectConversation,
  onClearConversation,
}: MessagingInboxChannelViewProps) => {
  const { t } = useLingui();
  const isMobile = useIsMobile();

  const list = useMessagingInboxConversations(channel);
  const { readChannel } = useMessagingInboxConnections();

  const connectionRead = readChannel(channel);

  // Syncing is offered only where the connection says it is allowed. canSync
  // defaults to false in the contract, so silence means no button.
  const canSync =
    connectionRead.kind === 'reported' && connectionRead.connection.canSync;

  const selectedConversation = isNonEmptyString(selectedConversationId)
    ? list.items.find(({ id }) => id === selectedConversationId)
    : undefined;

  const channelHeader = (
    <StyledChannelHeader>
      <MessagingInboxConnectionNote channel={channel} read={connectionRead} />
      {channel === 'EMAIL' && (
        <MessagingInboxEmailSyncPanel canSync={canSync} onSynced={list.reload} />
      )}
    </StyledChannelHeader>
  );

  const conversationList = (
    <MessagingInboxConversationList
      channel={channel}
      list={list}
      selectedConversationId={selectedConversationId}
      onSelect={onSelectConversation}
    />
  );

  const threadPane = isDefined(selectedConversation) ? (
    // Keyed on the conversation: a different thread is a different read, not
    // a mutation of the one on screen.
    <MessagingInboxThread
      key={selectedConversation.id}
      conversation={selectedConversation}
      connectionRead={connectionRead}
    />
  ) : isNonEmptyString(selectedConversationId) ? (
    <StyledPlaceholder>
      {/* The id in the address is not among the pages loaded so far. Said
          plainly, rather than shown as an empty conversation. */}
      <MessagingInboxNote role="alert">
        <Trans>This conversation is not in the loaded pages.</Trans>
      </MessagingInboxNote>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearConversation}
      >
        {t`Close`}
      </Button>
    </StyledPlaceholder>
  ) : (
    <StyledPlaceholder>
      <MessagingInboxNote>
        <Trans>Pick a conversation.</Trans>
      </MessagingInboxNote>
    </StyledPlaceholder>
  );

  if (isMobile) {
    return isNonEmptyString(selectedConversationId) ? (
      <StyledView>
        <StyledThreadPane>
          <StyledChannelHeader>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              startIcon={<IconArrowLeft />}
              onClick={onClearConversation}
            >
              {t`Conversations`}
            </Button>
          </StyledChannelHeader>
          {threadPane}
        </StyledThreadPane>
      </StyledView>
    ) : (
      <StyledView>
        <StyledListPane>
          {channelHeader}
          {conversationList}
        </StyledListPane>
      </StyledView>
    );
  }

  return (
    <StyledView>
      <StyledListPane>
        {channelHeader}
        {conversationList}
      </StyledListPane>
      <StyledThreadPane>{threadPane}</StyledThreadPane>
    </StyledView>
  );
};
