import { type CodeExecutionData } from 'kovaa-lab-shared/ai';

export type CodeExecutionStreamEmitter = (data: CodeExecutionData) => void;
