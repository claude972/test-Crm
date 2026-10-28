import { camelToKebab } from 'kovaa-lab-shared/utils';

import { DATA_ATTRIBUTE_PREFIX } from '@/polyfills/dom/constants/DataAttributePrefix';

export const convertDatasetPropertyToDataAttributeName = (
  datasetProperty: string,
): string => `${DATA_ATTRIBUTE_PREFIX}${camelToKebab(datasetProperty)}`;
