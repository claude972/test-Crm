import { capitalize, isDefined } from 'kovaa-lab-shared/utils';
import { useTheme } from 'kovaa-lab-ui/theme';

import { type CommandMenuItemSectionContext } from '@/command-menu-item/types/CommandMenuItemSectionContext';
import { useContextStoreObjectMetadataItem } from '@/context-store/hooks/useContextStoreObjectMetadataItem';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';

export const useCommandMenuItemObjectSectionContext = ():
  | CommandMenuItemSectionContext
  | undefined => {
  const theme = useTheme();
  const { objectMetadataItem } = useContextStoreObjectMetadataItem();

  if (!isDefined(objectMetadataItem)) {
    return undefined;
  }

  return {
    icon: (
      <ObjectMetadataIcon
        objectMetadataItem={objectMetadataItem}
        size={theme.icon.size.md}
      />
    ),
    label: capitalize(objectMetadataItem.labelPlural),
  };
};
