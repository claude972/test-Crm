import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { objectMetadataItemFamilySelector } from '@/object-metadata/states/objectMetadataItemFamilySelector';
import { recordPermissionsFamilySelector } from '@/object-record/record-sharing/states/recordPermissionsFamilySelector';
import { createAtomFamilySelector } from '@/ui/utilities/state/jotai/utils/createAtomFamilySelector';
import { type RecordPermissionsDto } from '~/generated-metadata/graphql';

export const agentChatThreadPermissionsFamilySelector =
  createAtomFamilySelector<RecordPermissionsDto | undefined, string>({
    key: 'agentChatThreadPermissionsFamilySelector',
    get:
      (threadId) =>
      ({ get }) => {
        const objectMetadata = get(objectMetadataItemFamilySelector, {
          objectName: CoreObjectNameSingular.AgentChatThread,
          objectNameType: 'singular',
        });
        return isDefined(objectMetadata)
          ? get(recordPermissionsFamilySelector, {
              objectMetadataId: objectMetadata.id,
              recordId: threadId,
            })
          : undefined;
      },
  });
