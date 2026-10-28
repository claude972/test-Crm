import { type ViewFieldManifest } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type UniversalFlatViewField } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-view-field.type';

export const fromFlatViewFieldToViewFieldManifest = ({
  flatViewField,
}: {
  flatViewField: UniversalFlatViewField;
}): ViewFieldManifest => ({
  universalIdentifier: flatViewField.universalIdentifier,
  fieldMetadataUniversalIdentifier:
    flatViewField.fieldMetadataUniversalIdentifier,
  position: flatViewField.position,
  isVisible: flatViewField.isVisible,
  size: flatViewField.size,
  ...(isDefined(flatViewField.aggregateOperation)
    ? { aggregateOperation: flatViewField.aggregateOperation }
    : {}),
  ...(isDefined(flatViewField.viewFieldGroupUniversalIdentifier)
    ? {
        viewFieldGroupUniversalIdentifier:
          flatViewField.viewFieldGroupUniversalIdentifier,
      }
    : {}),
});
