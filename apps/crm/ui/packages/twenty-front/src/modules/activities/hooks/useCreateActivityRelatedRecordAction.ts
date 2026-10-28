import { useCreateActivityForTargetRecord } from '@/activities/hooks/useCreateActivityForTargetRecord';
import { type ActivityTargetableObject } from '@/activities/types/ActivityTargetableEntity';
import { type RelatedRecordActionBinding } from '@/activities/types/RelatedRecordAction';
import { t } from '@lingui/core/macro';
import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';
import { IconCheckbox, IconNotes } from 'kovaa-lab-ui/icon';

type UseCreateActivityRelatedRecordActionParams = {
  targetRecord: ActivityTargetableObject;
  activityObjectNameSingular:
    | CoreObjectNameSingular.Note
    | CoreObjectNameSingular.Task;
};

export const useCreateActivityRelatedRecordAction = ({
  targetRecord,
  activityObjectNameSingular,
}: UseCreateActivityRelatedRecordActionParams): RelatedRecordActionBinding => {
  const { canCreateActivity, createActivity } =
    useCreateActivityForTargetRecord({
      targetRecord,
      activityObjectNameSingular,
    });

  const isTask = activityObjectNameSingular === CoreObjectNameSingular.Task;

  return {
    action: {
      id: isTask ? 'create-task' : 'create-note',
      label: isTask ? t`Create task` : t`Create note`,
      Icon: isTask ? IconCheckbox : IconNotes,
      isVisible: canCreateActivity,
      disabled: false,
      execute: createActivity,
    },
  };
};
