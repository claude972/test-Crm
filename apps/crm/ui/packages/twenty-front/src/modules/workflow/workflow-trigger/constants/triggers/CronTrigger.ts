import { type WorkflowTriggerType } from '@/workflow/types/Workflow';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const CRON_TRIGGER: {
  defaultLabel: string;
  type: WorkflowTriggerType;
  icon: string;
} = {
  defaultLabel: doNotTranslate('On a schedule'),
  type: 'CRON',
  icon: 'IconClock',
};
