import startCase from 'lodash.startcase';
import { capitalize } from 'kovaa-lab-shared/utils';

export const convertToLabel = (name: string): string =>
  capitalize(startCase(name).toLowerCase());
