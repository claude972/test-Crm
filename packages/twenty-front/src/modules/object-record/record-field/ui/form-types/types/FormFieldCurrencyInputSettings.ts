import { type FieldMetadataType } from 'kovaa-lab-shared/types';

export type FormFieldCurrencyInputSettings = {
  type: FieldMetadataType.CURRENCY;
  amountUnit: 'micros' | 'units';
};
