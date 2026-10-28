import { capitalize } from 'kovaa-lab-shared/utils';

export const buildTimelineActivityRelatedMorphFieldMetadataName = (
  name: string,
) => {
  return `target${capitalize(name)}`;
};
