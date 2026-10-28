import { interpolateMessagePlaceholders } from 'kovaa-lab-shared/i18n';
import { type CommandMenuContextApi, type Nullable } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';
import { getCommandMenuItemPlaceholderValues } from '@/command-menu-item/utils/getCommandMenuItemPlaceholderValues';
import { type CommandMenuItemFieldsFragment } from '~/generated-metadata/graphql';

type InterpolatedCommandMenuItemFields = {
  iconKey: Nullable<string>;
  label: string;
  shortLabel: Nullable<string>;
};

export const interpolateCommandMenuItemFields = (
  item: Pick<CommandMenuItemFieldsFragment, 'label' | 'shortLabel' | 'icon'>,
  commandMenuContextApi: CommandMenuContextApi,
): InterpolatedCommandMenuItemFields => {
  const values = getCommandMenuItemPlaceholderValues(commandMenuContextApi);

  const interpolate = (value: Nullable<string>): Nullable<string> =>
    isDefined(value) ? interpolateMessagePlaceholders(value, values) : value;

  return {
    iconKey: interpolate(item.icon),
    label: interpolateMessagePlaceholders(item.label, values),
    shortLabel: interpolate(item.shortLabel),
  };
};
