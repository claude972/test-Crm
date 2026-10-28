import { isDefined } from 'kovaa-lab-shared/utils';
import { IconHash, useIcons } from 'kovaa-lab-ui/icon';

// The icon set loads lazily, so the default stands in until it has
export const useAgentChatChannelIcon = (icon: string | null | undefined) => {
  const { getIcons } = useIcons();

  return (isDefined(icon) ? getIcons()[icon] : undefined) ?? IconHash;
};
