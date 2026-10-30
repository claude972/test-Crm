import { type ProspectionCountStatus } from '@/prospection/types/ProspectionCountStatus';

export type ProspectionCount = {
  status: ProspectionCountStatus;
  // Null whenever the figure is not known. A known zero stays 0: an empty
  // list and an unreadable one are different answers.
  value: number | null;
  // Rows the figure was computed over, and the rows it should have covered.
  // Both are set when the status is partial, so the denominator can be shown.
  covered?: number;
  total?: number;
};
