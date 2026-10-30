import { z } from 'zod';

const connectionSchema = z
  .object({
    workspaceId: z.string().uuid(),
    operatorUserId: z.string().uuid(),
    operatorUserWorkspaceId: z.string().uuid(),
    secret: z.string().regex(/^[a-f0-9]{64}$/),
    enabled: z.boolean().default(true),
    maxRequestsPerMinute: z.number().int().min(1).max(60).default(10),
  })
  .strict();

export type HermesIntakeConnection = z.infer<typeof connectionSchema>;

export const parseHermesIntakeConnections = (
  serialized: string,
): Record<string, HermesIntakeConnection> => {
  try {
    if (Buffer.byteLength(serialized, 'utf8') > 64_000) throw new Error();
    const connections = z
      .record(z.string().uuid(), connectionSchema)
      .parse(JSON.parse(serialized));
    const entries = Object.entries(connections);
    if (entries.length > 100) throw new Error();
    const secrets = new Set(entries.map(([, connection]) => connection.secret));
    if (secrets.size !== entries.length) throw new Error();
    return connections;
  } catch {
    throw new Error('Hermes intake configuration is invalid');
  }
};

export const hermesIntakeBodySchema = z
  .object({
    externalBatchId: z.string().min(1).max(91),
    name: z.string().min(1).max(200),
    sourceUrl: z.string().max(2048),
    collectedAt: z.string(),
    rows: z
      .array(
        z
          .object({
            email: z.string().max(254),
            companyName: z.string().max(200),
            firstName: z.string().max(100).optional(),
            lastName: z.string().max(100).optional(),
            jobTitle: z.string().max(200).optional(),
            website: z.string().max(2048).optional(),
            phone: z.string().max(40).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
