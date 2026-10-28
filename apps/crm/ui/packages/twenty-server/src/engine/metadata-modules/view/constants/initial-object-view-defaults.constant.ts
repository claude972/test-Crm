import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'kovaa-lab-shared/metadata';
import { ViewType } from 'kovaa-lab-shared/types';

export const INITIAL_OBJECT_VIEW_POSITION = 1;

export const INITIAL_OBJECT_VIEW_TYPE = ViewType.TABLE;

export const OBJECT_UNIVERSAL_IDENTIFIERS_WITHOUT_INITIAL_VIEW =
  new Set<string>([STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity]);
