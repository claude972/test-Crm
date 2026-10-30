import { z } from 'zod';

const fieldName = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/)
  .refine(
    (value) => !['constructor', 'prototype', '__proto__'].includes(value),
  );
const connectionSchema = z
  .object({
    endpoint: z
      .string()
      .max(2048)
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          (url.protocol === 'https:' ||
            (url.protocol === 'http:' && url.hostname === '127.0.0.1'))
        );
      }),
    token: z
      .string()
      .min(32)
      .max(4096)
      .regex(/^[\x21-\x7E]+$/),
    toolName: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9_.:-]+$/),
    protocolVersion: z.literal('2025-11-25').default('2025-11-25'),
    argumentMap: z
      .object({
        text: fieldName,
        conversationId: fieldName.optional(),
        messageId: fieldName.optional(),
        channel: fieldName.optional(),
        workspaceId: fieldName.optional(),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      new Set(Object.values(value.argumentMap)).size ===
      Object.values(value.argumentMap).length,
  );

export type HermesMcpConnection = z.infer<typeof connectionSchema>;
export type HermesMcpDraftInput = {
  workspaceId: string;
  conversationId: string;
  messageId: string;
  text: string;
  channel: 'WHATSAPP' | 'EMAIL';
};
export type HermesMcpDraftResult = {
  mode: 'MANUAL' | 'DRAFT';
  status: 'NOT_CONFIGURED' | 'READY' | 'UNAVAILABLE';
  text?: string;
  provider: 'HERMES_MCP';
};

export const draftInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    conversationId: z.string().uuid(),
    messageId: z.string().uuid(),
    text: z.string().min(1).max(10_000),
    channel: z.enum(['WHATSAPP', 'EMAIL']),
  })
  .strict();
export const parseHermesMcpConnections = (
  serialized: string,
): Record<string, HermesMcpConnection> => {
  if (Buffer.byteLength(serialized, 'utf8') > 100_000)
    throw new Error('Invalid MCP configuration');
  const connections = z
    .record(z.string().uuid(), connectionSchema)
    .parse(JSON.parse(serialized));
  const values = Object.values(connections);
  if (
    values.length > 100 ||
    new Set(values.map((entry) => entry.token)).size !== values.length
  )
    throw new Error('Invalid MCP configuration');
  return connections;
};
