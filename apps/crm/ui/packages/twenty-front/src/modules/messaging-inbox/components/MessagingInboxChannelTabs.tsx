import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconBrandWhatsapp, IconMail } from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  MESSAGING_INBOX_CHANNELS,
  type MessagingInboxChannel,
} from '@/messaging-inbox/types/MessagingInboxChannel';

const StyledTabList = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  padding: 0 ${themeCssVariables.spacing[3]};
`;

// Selection is carried by three cues at once, so it survives without colour:
// aria-selected for assistive technology, a 2px underline, and a heavier
// weight on the label.
const StyledTab = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.regular};
  gap: ${themeCssVariables.spacing[1]};
  margin: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[2]};

  &[aria-selected='true'] {
    border-bottom-color: ${themeCssVariables.accent.primary};
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: -1px;
  }

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.sm};
  }
`;

type MessagingInboxChannelTabsProps = {
  selectedChannel: MessagingInboxChannel;
  panelId: string;
  onSelect: (channel: MessagingInboxChannel) => void;
};

// The two tabs are exactly the two values the contract's `channel` filter
// accepts. There is no "all" tab, because the contract has no query for it.
export const MessagingInboxChannelTabs = ({
  selectedChannel,
  panelId,
  onSelect,
}: MessagingInboxChannelTabsProps) => {
  const { t } = useLingui();

  const labels: Record<MessagingInboxChannel, string> = {
    WHATSAPP: t`WhatsApp`,
    EMAIL: t`Email`,
  };

  return (
    <StyledTabList role="tablist" aria-label={t`Channel`}>
      {MESSAGING_INBOX_CHANNELS.map((channel) => {
        const isSelected = channel === selectedChannel;

        return (
          <StyledTab
            key={channel}
            type="button"
            role="tab"
            id={`${panelId}-tab-${channel}`}
            aria-selected={isSelected}
            aria-controls={panelId}
            onClick={() => onSelect(channel)}
          >
            {channel === 'WHATSAPP' ? <IconBrandWhatsapp /> : <IconMail />}
            {labels[channel]}
          </StyledTab>
        );
      })}
    </StyledTabList>
  );
};
