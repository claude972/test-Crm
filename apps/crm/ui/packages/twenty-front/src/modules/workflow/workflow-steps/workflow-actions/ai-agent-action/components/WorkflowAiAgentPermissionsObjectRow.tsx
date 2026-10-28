import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isDefined } from 'kovaa-lab-shared/utils';
import { ListItemButton } from 'kovaa-lab-ui/components/navigation';
import { ListItem } from 'kovaa-lab-ui/primitives/navigation';

type WorkflowAiAgentPermissionsObjectRowProps = {
  objectMetadata: Pick<
    EnrichedObjectMetadataItem,
    'id' | 'icon' | 'labelPlural' | 'nameSingular' | 'color' | 'isSystem'
  >;
  onClick?: () => void;
  readonly: boolean;
};

export const WorkflowAiAgentPermissionsObjectRow = ({
  objectMetadata,
  onClick,
  readonly,
}: WorkflowAiAgentPermissionsObjectRowProps) => {
  const startIcon = <ObjectMetadataIcon objectMetadataItem={objectMetadata} />;

  if (readonly || !isDefined(onClick)) {
    return (
      <ListItem startIcon={startIcon}>{objectMetadata.labelPlural}</ListItem>
    );
  }

  return (
    <ListItemButton startIcon={startIcon} hasSubmenu onClick={onClick}>
      {objectMetadata.labelPlural}
    </ListItemButton>
  );
};
