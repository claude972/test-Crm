import { isIP } from 'node:net';

import { z } from 'zod';

const senderDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/);

const connectionSchema = z
  .object({
    host: z.string().min(1).max(253).regex(/^[a-zA-Z0-9.:[\]-]+$/),
    port: z.number().int().min(1).max(65535),
    security: z.enum(['tls', 'starttls', 'plaintext-loopback']),
    username: z.string().min(1).max(1000).optional(),
    password: z.string().min(1).max(2048).optional(),
    senderDomains: z.array(senderDomainSchema).min(1).max(20),
  })
  .strict()
  .refine((value) => Boolean(value.username) === Boolean(value.password))
  .refine((value) => {
    if (value.security !== 'plaintext-loopback') return true;

    return (
      value.host === 'localhost' ||
      (isIP(value.host) === 4 && value.host.startsWith('127.')) ||
      value.host === '::1'
    );
  });

export type HermesSmtpConnection = z.infer<typeof connectionSchema>;

export const parseSmtpConnections = (
  serialized: string,
): Record<string, HermesSmtpConnection> => {
  if (Buffer.byteLength(serialized, 'utf8') > 65_536) {
    throw new Error('SMTP configuration is too large');
  }

  const parsed: unknown = JSON.parse(serialized);
  const connections = z
    .record(z.string().uuid(), connectionSchema)
    .parse(parsed);

  if (Object.keys(connections).length > 100) {
    throw new Error('Too many SMTP workspace connections');
  }

  return connections;
};
