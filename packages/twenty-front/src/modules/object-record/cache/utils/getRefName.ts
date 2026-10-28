import { getNodeTypename } from 'kovaa-lab-shared/utils';

export const getRefName = (objectNameSingular: string, id: string) => {
  const nodeTypeName = getNodeTypename(objectNameSingular);

  return `${nodeTypeName}:${id}`;
};
