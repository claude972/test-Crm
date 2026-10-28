import { type ObjectRecord } from 'kovaa-lab-shared/types';

export const isFreshlyCreatedRecord = (
  record: ObjectRecord & { createdAt: string; updatedAt: string },
): boolean => {
  const createdAt = record.createdAt;
  const updatedAt = record.updatedAt;

  return new Date(createdAt).getTime() === new Date(updatedAt).getTime();
};
