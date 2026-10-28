import { isDefined } from 'kovaa-lab-shared/utils';
import { type CommandMenuItemFieldsFragment } from '~/generated-metadata/graphql';

export const doesCommandMenuItemMatchPageLayoutId =
  (pageLayoutId: string | null) => (item: CommandMenuItemFieldsFragment) =>
    !isDefined(item.pageLayoutId) || item.pageLayoutId === pageLayoutId;
