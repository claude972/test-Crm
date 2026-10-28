import { ALLOWED_ADDRESS_SUBFIELDS } from 'kovaa-lab-shared/types';
import { z } from 'zod';

export const addressFieldSettingsSchema = z.object({
  subFields: z
    .array(z.enum(ALLOWED_ADDRESS_SUBFIELDS))
    .min(1)
    .optional()
    .nullable(),
});
