import { type FieldMetadataType } from 'kovaa-lab-shared/types';
import { pascalCase } from 'kovaa-lab-shared/utils';

import { ObjectTypeDefinitionKind } from 'src/engine/api/graphql/workspace-schema-builder/enums/object-type-definition-kind.enum';

export const computeCompositeFieldObjectTypeKey = (
  compositeFieldMetadataType: FieldMetadataType,
): string => {
  return `${pascalCase(compositeFieldMetadataType)}${ObjectTypeDefinitionKind.Plain.toString()}`;
};
