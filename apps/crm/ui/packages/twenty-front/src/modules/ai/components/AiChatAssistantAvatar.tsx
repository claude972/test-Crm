import { TintedIconTile } from 'kovaa-lab-ui/components/data-display';
import { IconSparkles } from 'kovaa-lab-ui/icon';
import { useTheme } from 'kovaa-lab-ui/theme';

import { AGENT_CHAT_ASSISTANT_COLOR } from '@/ai/constants/AgentChatAssistantColor';

export const AiChatAssistantAvatar = () => {
  const theme = useTheme();

  return (
    <TintedIconTile
      icon={<IconSparkles size={theme.icon.size.sm} />}
      color={AGENT_CHAT_ASSISTANT_COLOR}
    />
  );
};
