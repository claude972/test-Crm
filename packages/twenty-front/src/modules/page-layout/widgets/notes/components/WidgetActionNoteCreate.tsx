import { WidgetActionActivityCreate } from '@/page-layout/widgets/components/WidgetActionActivityCreate';
import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';

export const WidgetActionNoteCreate = () => (
  <WidgetActionActivityCreate
    activityObjectNameSingular={CoreObjectNameSingular.Note}
  />
);
