import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';

import { AppPath, SettingsPath } from 'kovaa-lab-shared/types';
import { getAppPath, getSettingsPath } from 'kovaa-lab-shared/utils';
import {
  IconBuildingSkyscraper,
  IconGauge,
  IconSettings,
  useIcons,
} from 'kovaa-lab-ui/icon';

import { HERMES_RECORD_NAVIGATION_ORDER } from '@/hermes-shell/constants/HermesRecordNavigationOrder';
import { HERMES_SHELL_ROUTE_PATHS } from '@/hermes-shell/constants/HermesShellRoutePaths';
import { type HermesNavigationSection } from '@/hermes-shell/types/HermesNavigationItem';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';

const NAVIGATION_ORDER: readonly string[] = HERMES_RECORD_NAVIGATION_ORDER;

// An object outside the reading order keeps its metadata position after the
// ranked ones instead of jumping to the top.
const getNavigationRank = (nameSingular: string): number => {
  const rank = NAVIGATION_ORDER.indexOf(nameSingular);

  return rank === -1 ? NAVIGATION_ORDER.length : rank;
};

// The sidebar is built from the workspace's own metadata and permissions, so
// it can only offer destinations that exist and that this session may read.
// An object the role cannot read is left out rather than shown and refused.
export const useHermesNavigationSections = (): HermesNavigationSection[] => {
  const { t } = useLingui();
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const { getIcon } = useIcons();

  return useMemo(() => {
    const readableRecordObjects = objectMetadataItems
      .filter(
        (objectMetadataItem) =>
          objectMetadataItem.isActive &&
          !objectMetadataItem.isSystem &&
          getObjectPermissionsForObject(
            objectPermissionsByObjectMetadataId,
            objectMetadataItem.id,
          ).canReadObjectRecords,
      )
      .sort(
        (firstObject, secondObject) =>
          getNavigationRank(firstObject.nameSingular) -
          getNavigationRank(secondObject.nameSingular),
      );

    const sections: HermesNavigationSection[] = [
      {
        key: 'overview',
        label: t`Overview`,
        items: [
          {
            key: 'operations-dashboard',
            label: t`Dashboard`,
            to: HERMES_SHELL_ROUTE_PATHS.operationsDashboard,
            Icon: IconGauge,
          },
        ],
      },
    ];

    if (readableRecordObjects.length > 0) {
      sections.push({
        key: 'records',
        label: t`Records`,
        items: readableRecordObjects.map((objectMetadataItem) => ({
          key: objectMetadataItem.id,
          label: objectMetadataItem.labelPlural,
          to: getAppPath(AppPath.RecordIndexPage, {
            objectNamePlural: objectMetadataItem.namePlural,
          }),
          Icon: getIcon(objectMetadataItem.icon),
        })),
      });
    }

    sections.push({
      key: 'workspace',
      label: t`Workspace`,
      items: [
        {
          key: 'structures',
          label: t`Authorised companies`,
          to: getSettingsPath(SettingsPath.Structures),
          Icon: IconBuildingSkyscraper,
        },
        {
          key: 'settings',
          label: t`Settings`,
          to: getSettingsPath(SettingsPath.ProfilePage),
          Icon: IconSettings,
        },
      ],
    });

    return sections;
  }, [objectMetadataItems, objectPermissionsByObjectMetadataId, getIcon, t]);
};
