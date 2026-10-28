import { type WorkflowClassifyQuestion } from 'kovaa-lab-shared/workflow';

export type WorkflowClassifyActionInput = {
  state: string;
  questions: WorkflowClassifyQuestion[];
};
