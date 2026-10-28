import {
  buildObjectMetadataLabelPlaceholderValues,
  interpolateMessagePlaceholders,
} from 'kovaa-lab-shared/i18n';
import { isDefined } from 'kovaa-lab-shared/utils';
import { type FlatObjectMetadataItem } from '@/metadata-store/types/FlatObjectMetadataItem';

export const resolveViewNamePlaceholders = (
  viewName: string | undefined,
  objectMetadataItem: FlatObjectMetadataItem | undefined,
): string => {
  if (!isDefined(viewName) || !isDefined(objectMetadataItem)) {
    return viewName ?? '';
  }

  return interpolateMessagePlaceholders(
    viewName,
    buildObjectMetadataLabelPlaceholderValues(objectMetadataItem),
  );
};
