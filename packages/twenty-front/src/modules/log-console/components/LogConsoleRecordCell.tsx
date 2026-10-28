import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { useTheme } from 'kovaa-lab-ui/theme';

import { allowRequestsToKovaaLab CRMIconsState } from '@/client-config/states/allowRequestsToKovaaLab CRMIcons';
import { getLogConsoleRecordLabel } from '@/log-console/utils/getLogConsoleRecordLabel';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { objectMetadataItemsByIdMapSelector } from '@/object-metadata/states/objectMetadataItemsByIdMapSelector';
import { getObjectRecordIdentifier } from '@/object-metadata/utils/getObjectRecordIdentifier';
import { SettingsTableTextCell } from '@/settings/components/SettingsTableTextCell';
import { AvatarOrIcon } from '@/ui/field/display/components/internal/AvatarOrIcon/AvatarOrIcon';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type EventLogRecord } from '~/generated-metadata/graphql';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';

type LogConsoleRecordCellProps = {
  entry: EventLogRecord;
};

export const LogConsoleRecordCell = ({ entry }: LogConsoleRecordCellProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const objectMetadataItemsByIdMap = useAtomStateValue(
    objectMetadataItemsByIdMapSelector,
  );
  const allowRequestsToKovaaLab CRMIcons = useAtomStateValue(
    allowRequestsToKovaaLab CRMIconsState,
  );

  const objectMetadataItem = objectMetadataItemsByIdMap.get(
    entry.objectMetadataId ?? '',
  );
  const recordSnapshot = entry.properties?.after ?? entry.properties?.before;

  if (isDefined(objectMetadataItem) && isDefined(recordSnapshot)) {
    const recordIdentifier = getObjectRecordIdentifier({
      objectMetadataItem,
      record: recordSnapshot,
      allowRequestsToKovaaLab CRMIcons,
    });

    return (
      <SettingsTableTextCell
        startElement={
          <AvatarOrIcon
            name={recordIdentifier.name}
            colorSeed={recordIdentifier.id}
            shape={recordIdentifier.avatarShape ?? undefined}
            src={getAbsoluteImageUrl(recordIdentifier.avatarUrl ?? '')}
          />
        }
        text={
          isNonEmptyString(recordIdentifier.name)
            ? recordIdentifier.name
            : t`Untitled`
        }
      />
    );
  }

  return (
    <SettingsTableTextCell
      startElement={
        <ObjectMetadataIcon
          objectMetadataItem={objectMetadataItem}
          size={theme.icon.size.sm}
          stroke={theme.icon.stroke.sm}
        />
      }
      text={getLogConsoleRecordLabel({ entry, objectMetadataItem })}
    />
  );
};
