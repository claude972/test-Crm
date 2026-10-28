import { type AgentResponseSchema } from 'kovaa-lab-shared/ai';

export const buildStrictAgentResponseSchema = (
  schema: AgentResponseSchema,
): AgentResponseSchema => ({
  ...schema,
  required: Object.keys(schema.properties),
  additionalProperties: false,
});
