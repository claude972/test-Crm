import { isDefined } from 'kovaa-lab-shared/utils';

export const formatProgressLine = ({
  message,
  percentage,
}: {
  message: string;
  percentage?: number;
}) => (isDefined(percentage) ? `${message} ${percentage}%` : message);
