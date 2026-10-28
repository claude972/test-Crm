import { capitalize } from 'kovaa-lab-shared/utils';

export const getUpdateManyRecordsMutationResponseField = (
  objectNamePlural: string,
) => `update${capitalize(objectNamePlural)}`;
