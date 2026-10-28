import { type AgentResponseFormat } from 'kovaa-lab-shared/ai';
import { type WorkflowConversation } from 'kovaa-lab-shared/workflow';

export type WorkflowAiAgentActionInput = {
  agentId: string;
  prompt?: string;
  responseFormat?: AgentResponseFormat;
  humanInputInstructions?: string;
  workspaceMemberId?: string;
  conversation?: WorkflowConversation;
};
