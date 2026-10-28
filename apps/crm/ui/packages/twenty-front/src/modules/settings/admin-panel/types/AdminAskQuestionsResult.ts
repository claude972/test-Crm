import { type AskQuestionAnswer, type AskQuestionItem } from 'kovaa-lab-shared/ai';

export type AdminAskQuestionsResult = {
  questions: AskQuestionItem[];
  status: string;
  answers?: AskQuestionAnswer[];
};
