import { ViewFilterOperand } from 'kovaa-lab-shared/types';
import { relationFilterValueSchemaObject } from 'kovaa-lab-shared/utils';
import z from 'zod';
import { urlRecursiveFilterGroupSchema } from './urlRecursiveFilterGroupSchema';

export const filterUrlQueryParamsSchema = z.object({
  filter: z
    .record(
      z.string(),
      z.partialRecord(
        z.enum(ViewFilterOperand),
        z.string().or(z.array(z.string())).or(relationFilterValueSchemaObject),
      ),
    )
    .optional(),
  filterDisplayValue: z
    .record(z.string(), z.partialRecord(z.enum(ViewFilterOperand), z.string()))
    .optional()
    .catch(undefined),
  filterGroup: urlRecursiveFilterGroupSchema.optional(),
});
