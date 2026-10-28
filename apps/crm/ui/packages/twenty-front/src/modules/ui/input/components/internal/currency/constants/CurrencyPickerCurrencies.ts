import { type CurrencyPickerOption } from 'kovaa-lab-ui/components/input';
import { CURRENCY_CODE_LABELS } from 'kovaa-lab-shared/constants';

export const CURRENCY_PICKER_CURRENCIES: readonly CurrencyPickerOption[] =
  Object.entries(CURRENCY_CODE_LABELS).map(([code, { label }]) => ({
    code,
    name: label,
  }));
