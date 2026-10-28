import { useContext } from 'react';

import { getFieldButtonIcon } from '@/object-record/record-field/ui/utils/getFieldButtonIcon';

import { type IconComponent } from 'kovaa-lab-ui/icon';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';

export const useGetButtonIcon = (): IconComponent | undefined => {
  const { fieldDefinition } = useContext(FieldContext);

  return getFieldButtonIcon(fieldDefinition);
};
