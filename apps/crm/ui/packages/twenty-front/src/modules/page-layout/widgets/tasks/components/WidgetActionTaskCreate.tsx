import { WidgetActionActivityCreate } from '@/page-layout/widgets/components/WidgetActionActivityCreate';
import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';

export const WidgetActionTaskCreate = () => (
  <WidgetActionActivityCreate
    activityObjectNameSingular={CoreObjectNameSingular.Task}
  />
);
