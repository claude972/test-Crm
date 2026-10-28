import { type jsonRelationFilterValueSchema } from 'kovaa-lab-shared/utils';
import { type z } from 'zod';

export type RelationFilterValue = z.infer<typeof jsonRelationFilterValueSchema>;
