import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isDefined } from 'kovaa-lab-shared/utils';
import { useIcons } from 'kovaa-lab-ui/icon';
import { useTheme } from 'kovaa-lab-ui/theme';

export const EventIconDynamicComponent = ({
  eventIcon,
  linkedObjectMetadataItem,
}: {
  eventIcon: string | null;
  linkedObjectMetadataItem: EnrichedObjectMetadataItem | null;
}) => {
  const { getIcon } = useIcons();
  const theme = useTheme();

  if (!isDefined(eventIcon)) {
    return <ObjectMetadataIcon objectMetadataItem={linkedObjectMetadataItem} />;
  }

  const EventIcon = getIcon(eventIcon);

  return <EventIcon size={theme.icon.size.md} />;
};
