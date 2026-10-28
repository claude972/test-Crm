import {
  type IconComponent,
  IconAt,
  IconCheck,
  IconCircleDashed,
  IconHandClick,
  IconUsers,
  IconZzz,
} from 'kovaa-lab-ui/icon';

import { type AgentChatThreadFilterStatus } from '@/ai/types/AgentChatThreadFilterStatus';

export const AGENT_CHAT_THREAD_FILTER_STATUS_ICONS: Record<
  AgentChatThreadFilterStatus,
  IconComponent
> = {
  active: IconCircleDashed,
  needsInput: IconHandClick,
  mentions: IconAt,
  assigned: IconUsers,
  snoozed: IconZzz,
  done: IconCheck,
};
