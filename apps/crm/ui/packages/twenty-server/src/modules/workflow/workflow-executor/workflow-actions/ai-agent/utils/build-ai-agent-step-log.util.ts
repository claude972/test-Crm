import { type AgentRunSummary } from 'kovaa-lab-shared/ai';
import { type WorkflowRunStepLog } from 'kovaa-lab-shared/workflow';

export const buildAiAgentStepLog = ({
  summary,
  threadId,
}: {
  summary: AgentRunSummary;
  threadId: string;
}): WorkflowRunStepLog => ({
  details: { type: 'AI_AGENT', ...summary, threadId },
  entries: [],
  sizeBytes: 0,
});
