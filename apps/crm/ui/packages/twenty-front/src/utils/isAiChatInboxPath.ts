import { AppPath } from 'kovaa-lab-shared/types';

import { isMatchingPathname } from '~/utils/isMatchingPathname';

export const isAiChatInboxPath = (pathname: string) =>
  isMatchingPathname(pathname, AppPath.AiChatInbox);
