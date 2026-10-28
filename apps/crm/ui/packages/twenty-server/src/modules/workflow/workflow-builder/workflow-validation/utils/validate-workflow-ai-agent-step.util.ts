import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { type WorkflowValidationIssue } from 'kovaa-lab-shared/workflow';

import { type WorkflowAiAgentAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const validateWorkflowAiAgentStep = (
  step: WorkflowAiAgentAction,
): WorkflowValidationIssue[] => {
  const issues: WorkflowValidationIssue[] = [];

  if (!isNonEmptyString(step.settings?.input?.agentId)) {
    issues.push({
      severity: 'error',
      code: 'AI_AGENT_MISSING_AGENT',
      message: `Agent step "${step.name ?? step.id}" has no agent selected.`,
      stepId: step.id,
    });
  }

  const outputSchema = step.settings?.outputSchema;
  const hasWorkflowOutputSchema =
    isDefined(outputSchema) && Object.keys(outputSchema).length > 0;

  if (!hasWorkflowOutputSchema) {
    issues.push({
      severity: 'warning',
      code: 'AI_AGENT_MISSING_OUTPUT_VARIABLE',
      message: `Agent step "${step.name ?? step.id}" has no output variable defined. Downstream steps won't be able to reference its result.`,
      stepId: step.id,
    });
  }

  return issues;
};
