import { capitalize } from 'kovaa-lab-shared/utils';
export const getCreateManyRecordsMutationResponseField = (
  objectNamePlural: string,
) => `create${capitalize(objectNamePlural)}`;
