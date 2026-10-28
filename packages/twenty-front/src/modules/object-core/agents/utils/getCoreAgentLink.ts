import { AppPath } from 'kovaa-lab-shared/types';
import { getAppPath } from 'kovaa-lab-shared/utils';

export const getCoreAgentLink = (agentId: string) =>
  getAppPath(AppPath.AgentShowPage, { agentId });
