import { type AgentResponseFieldType } from 'kovaa-lab-shared/ai';

export type OutputSchemaField = {
  id: string;
  name: string;
  description?: string;
  type: AgentResponseFieldType | undefined;
};
