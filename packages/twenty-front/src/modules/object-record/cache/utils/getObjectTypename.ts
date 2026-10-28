import { capitalize } from 'kovaa-lab-shared/utils';
export const getObjectTypename = (objectNameSingular: string) => {
  return capitalize(objectNameSingular);
};
