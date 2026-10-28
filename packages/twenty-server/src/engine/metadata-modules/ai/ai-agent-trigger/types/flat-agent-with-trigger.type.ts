import { type AgentTrigger } from 'kovaa-lab-shared/application';

import { type FlatAgent } from 'src/engine/metadata-modules/flat-agent/types/flat-agent.type';

export type FlatAgentWithTrigger<TTrigger extends AgentTrigger> = {
  flatAgent: FlatAgent;
  trigger: TTrigger;
};
