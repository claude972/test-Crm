import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { useCallback, useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxChannelTabs } from '@/messaging-inbox/components/MessagingInboxChannelTabs';
import { MessagingInboxChannelView } from '@/messaging-inbox/components/MessagingInboxChannelView';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import {
  MESSAGING_INBOX_CHANNEL_SEARCH_PARAM,
  MESSAGING_INBOX_CONVERSATION_SEARCH_PARAM,
} from '@/messaging-inbox/constants/MessagingInboxRoutePaths';
import {
  getMessagingInboxChannelSlug,
  type MessagingInboxChannel,
  readMessagingInboxChannelSlug,
} from '@/messaging-inbox/types/MessagingInboxChannel';

const StyledScreen = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledTopNote = styled.div`
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]} 0;
`;

const StyledPanel = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

// The unified inbox: WhatsApp and email in one screen, one channel at a time
// because `channel` is the only filter the contract publishes.
//
// Both the channel and the opened conversation live in the address, so a
// thread survives a reload and can be handed to a colleague.
export const MessagingInboxScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const panelId = useId();

  const channel = readMessagingInboxChannelSlug(
    searchParams.get(MESSAGING_INBOX_CHANNEL_SEARCH_PARAM),
  );
  const selectedConversationId = searchParams.get(
    MESSAGING_INBOX_CONVERSATION_SEARCH_PARAM,
  );

  const selectChannel = useCallback(
    (nextChannel: MessagingInboxChannel) => {
      const params = new URLSearchParams(searchParams);

      params.set(
        MESSAGING_INBOX_CHANNEL_SEARCH_PARAM,
        getMessagingInboxChannelSlug(nextChannel),
      );
      // A conversation belongs to one channel, so it is dropped rather than
      // carried into a tab where it would not be found.
      params.delete(MESSAGING_INBOX_CONVERSATION_SEARCH_PARAM);

      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const selectConversation = useCallback(
    (conversationId: string) => {
      const params = new URLSearchParams(searchParams);

      params.set(
        MESSAGING_INBOX_CHANNEL_SEARCH_PARAM,
        getMessagingInboxChannelSlug(channel),
      );
      params.set(
        MESSAGING_INBOX_CONVERSATION_SEARCH_PARAM,
        conversationId,
      );

      setSearchParams(params);
    },
    [channel, searchParams, setSearchParams],
  );

  const clearConversation = useCallback(() => {
    const params = new URLSearchParams(searchParams);

    params.delete(MESSAGING_INBOX_CONVERSATION_SEARCH_PARAM);

    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  return (
    <StyledScreen>
      <StyledTopNote>
        {/* Said once, at the top: nothing on this screen updates on its own. */}
        <MessagingInboxNote>
          <Trans>Manual refresh only.</Trans>
        </MessagingInboxNote>
      </StyledTopNote>

      <MessagingInboxChannelTabs
        selectedChannel={channel}
        panelId={panelId}
        onSelect={selectChannel}
      />

      <StyledPanel
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${channel}`}
      >
        {/* Keyed on the channel: a tab change is a new read, not a filter
            applied to the list already on screen. */}
        <MessagingInboxChannelView
          key={channel}
          channel={channel}
          selectedConversationId={selectedConversationId}
          onSelectConversation={selectConversation}
          onClearConversation={clearConversation}
        />
      </StyledPanel>
    </StyledScreen>
  );
};
