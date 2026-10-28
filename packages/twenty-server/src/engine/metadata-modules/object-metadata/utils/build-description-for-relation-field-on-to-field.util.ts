import { capitalize } from 'kovaa-lab-shared/utils';
export const buildDescriptionForRelationFieldMetadataOnToField = ({
  relationObjectMetadataNamePlural,
  targetObjectLabelSingular,
}: {
  relationObjectMetadataNamePlural: string;
  targetObjectLabelSingular: string;
}) => {
  const description = `${capitalize(relationObjectMetadataNamePlural)} ${targetObjectLabelSingular}`;

  return { description };
};
