import { isDefined } from 'kovaa-lab-shared/utils';

export const isListValue = (value: string): boolean => {
  return isDefined(value) && value.includes(',');
};
