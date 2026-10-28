import { isDefined } from 'kovaa-lab-shared/utils';
import { type FullNameMetadata } from 'kovaa-lab-shared/types';

export const computeDisplayName = (
  name: FullNameMetadata | null | undefined,
) => {
  if (!name) {
    return '';
  }

  return Object.values(name).filter(isDefined).join(' ');
};
