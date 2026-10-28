import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { useOpenAddToMessageListInSidePanel } from '@/side-panel/hooks/useOpenAddToMessageListInSidePanel';
import { isDefined } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const AddRecordsToMessageListCommand = () => {
  const { graphqlFilter } = useHeadlessCommandContextApi();

  const { openAddToMessageListInSidePanel } =
    useOpenAddToMessageListInSidePanel();

  if (!isDefined(graphqlFilter)) {
    throw new Error(
      doNotTranslate('Selected records filter is required to add to a list'),
    );
  }

  return (
    <HeadlessEngineCommandWrapperEffect
      execute={() => openAddToMessageListInSidePanel(graphqlFilter)}
    />
  );
};
