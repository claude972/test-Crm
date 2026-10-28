import { type TimelineActivityTypeSnapshot } from 'kovaa-lab-shared/timeline';

export type TimelineActivityType = TimelineActivityTypeSnapshot & {
  isActive?: boolean;
};
