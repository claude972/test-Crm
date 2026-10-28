import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { t } from '@lingui/core/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { ListItemButton } from 'kovaa-lab-ui/components/navigation';
import { ListItem } from 'kovaa-lab-ui/primitives/navigation';
import { IconSettings } from 'kovaa-lab-ui/icon';
import { WorkflowAiAgentPermissionsObjectRow } from './WorkflowAiAgentPermissionsObjectRow';

type WorkflowAiAgentPermissionsObjectsListProps = {
  heading?: string;
  objects: Array<
    Pick<
      EnrichedObjectMetadataItem,
      'id' | 'icon' | 'labelPlural' | 'nameSingular' | 'color' | 'isSystem'
    >
  >;
  onObjectClick: (objectId: string) => void;
  onSystemObjectsClick?: () => void;
  readonly: boolean;
};

export const WorkflowAiAgentPermissionsObjectsList = ({
  heading,
  objects,
  onObjectClick,
  onSystemObjectsClick,
  readonly,
}: WorkflowAiAgentPermissionsObjectsListProps) => {
  return (
    <SidePanelGroup heading={heading ?? t`Objects`}>
      {objects.map((objectMetadata) => (
        <WorkflowAiAgentPermissionsObjectRow
          key={objectMetadata.id}
          objectMetadata={objectMetadata}
          onClick={() => onObjectClick(objectMetadata.id)}
          readonly={readonly}
        />
      ))}
      {isDefined(onSystemObjectsClick) &&
        (readonly ? (
          <ListItem startIcon={<IconSettings />}>{t`System objects`}</ListItem>
        ) : (
          <ListItemButton
            startIcon={<IconSettings />}
            hasSubmenu
            onClick={onSystemObjectsClick}
          >
            {t`System objects`}
          </ListItemButton>
        ))}
    </SidePanelGroup>
  );
};
