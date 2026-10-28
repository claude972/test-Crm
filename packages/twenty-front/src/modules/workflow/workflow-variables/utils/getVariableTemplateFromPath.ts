import { joinVariablePath } from 'kovaa-lab-shared/workflow';

export const getVariableTemplateFromPath = ({
  stepId,
  path,
}: {
  stepId: string;
  path: string[];
}) => {
  if (path.length === 0) {
    return `{{${stepId}}}`;
  }

  return `{{${stepId}.${joinVariablePath(path)}}}`;
};
