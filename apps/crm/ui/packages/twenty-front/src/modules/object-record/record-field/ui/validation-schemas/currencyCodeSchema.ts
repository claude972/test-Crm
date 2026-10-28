import { z } from 'zod';

import { CurrencyCode } from 'kovaa-lab-shared/constants';

export const currencyCodeSchema = z.enum(CurrencyCode);
