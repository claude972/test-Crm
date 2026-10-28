import { type CompositeFieldType } from '@/settings/data-model/types/CompositeFieldType';
import { type FilterableFieldType } from 'kovaa-lab-shared/types';

export type CompositeFilterableFieldType = FilterableFieldType &
  CompositeFieldType;
