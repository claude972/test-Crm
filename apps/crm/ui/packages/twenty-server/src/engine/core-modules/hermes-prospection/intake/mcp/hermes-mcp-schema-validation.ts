import { z } from 'zod';

const primitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const propertySchema = z
  .object({
    type: z.enum(['string', 'number', 'integer', 'boolean', 'null']),
    title: z.string().optional(),
    description: z.string().optional(),
    enum: z.array(primitive).optional(),
    const: primitive.optional(),
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().nonnegative().optional(),
    pattern: z.string().max(2048).optional(),
    format: z.string().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    exclusiveMinimum: z.number().optional(),
    exclusiveMaximum: z.number().optional(),
    multipleOf: z.number().positive().optional(),
    default: z.unknown().optional(),
    examples: z.array(z.unknown()).optional(),
  })
  .strict();
const supportedSchema = z
  .object({
    type: z.literal('object'),
    properties: z.record(z.string(), propertySchema),
    required: z.array(z.string()).optional(),
    additionalProperties: z.boolean().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    $schema: z
      .enum([
        'http://json-schema.org/draft-04/schema#',
        'http://json-schema.org/draft-07/schema#',
        'https://json-schema.org/draft/2020-12/schema',
      ])
      .optional(),
  })
  .strict();

export const validateHermesMcpSchema = (
  schema: Record<string, unknown>,
  value: unknown,
): void => {
  // Limit this first profile to auditable flat tool arguments/results; richer
  // schema constructs fail closed rather than being silently approximated.
  const parsed = supportedSchema.parse(schema);
  const record = z.record(z.string(), z.unknown()).parse(value);
  if (
    parsed.required?.some(
      (name) => !Object.prototype.hasOwnProperty.call(record, name),
    )
  )
    throw new Error('Missing MCP schema requirement');
  if (
    Object.keys(record).some(
      (name) => !Object.prototype.hasOwnProperty.call(parsed.properties, name),
    )
  )
    throw new Error('Undeclared MCP tool field');
  z.fromJSONSchema(parsed).parse(value);
};
