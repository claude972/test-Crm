import { z } from 'zod';

const originSchema = z
  .string()
  .max(2048)
  .transform((value, context) => {
    try {
      const url = new URL(value);
      const loopbackFixture =
        url.protocol === 'http:' && url.hostname === '127.0.0.1';
      if (
        (!loopbackFixture && url.protocol !== 'https:') ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
      )
        throw new Error();
      return url.origin;
    } catch {
      context.addIssue({ code: 'custom', message: 'Invalid Evolution origin' });
      return z.NEVER;
    }
  });

const connectionSchema = z
  .object({
    baseUrl: originSchema,
    instanceName: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9_-]+$/),
    apiKey: z
      .string()
      .min(1)
      .max(4096)
      .regex(/^[\x21-\x7e]+$/),
  })
  .strict();

export type EvolutionConnection = z.infer<typeof connectionSchema>;

export const parseEvolutionConnections = (
  serialized: string,
): Record<string, EvolutionConnection> => {
  try {
    if (Buffer.byteLength(serialized) > 65_536) throw new Error();
    const connections = z
      .record(z.string().uuid(), connectionSchema)
      .parse(JSON.parse(serialized));
    if (Object.keys(connections).length > 100) throw new Error();
    const instances = new Set<string>();
    for (const connection of Object.values(connections)) {
      const identity = `${connection.baseUrl}/${connection.instanceName}`;
      if (instances.has(identity)) throw new Error();
      instances.add(identity);
    }
    return connections;
  } catch {
    throw new Error('Evolution workspace configuration is invalid');
  }
};
