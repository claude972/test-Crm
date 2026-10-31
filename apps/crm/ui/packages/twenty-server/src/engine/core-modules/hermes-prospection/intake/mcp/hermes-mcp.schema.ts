import { z } from 'zod';

const fieldName = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/)
  .refine(
    (value) => !['constructor', 'prototype', '__proto__'].includes(value),
  );
const toolNameValue = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/);
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
    toolName: toolNameValue,
    // Explicit operator grant. Discovery reports every advertised tool, but
    // only a name listed here may ever be called, and the drafting tool must
    // itself be granted. Absent, the grant is exactly the drafting tool, so an
    // existing connection keeps its current single-tool authorization.
    authorizedTools: z.array(toolNameValue).min(1).max(32).optional(),
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
  )
  .refine(
    (value) =>
      !value.authorizedTools ||
      (new Set(value.authorizedTools).size === value.authorizedTools.length &&
        value.authorizedTools.includes(value.toolName)),
  );

export type HermesMcpConnection = z.infer<typeof connectionSchema>;
// The effective operator grant for a connection. Kept as a function so no
// caller has to re-derive the "absent means exactly the drafting tool" rule.
export const authorizedToolNames = (
  connection: Pick<HermesMcpConnection, 'toolName' | 'authorizedTools'>,
): readonly string[] => connection.authorizedTools ?? [connection.toolName];
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

// Why a tool advertised by the server is still not callable. Reported so an
// operator can act on it instead of guessing why the bot stays manual.
export type HermesMcpToolRefusal =
  | 'NOT_AUTHORIZED'
  | 'NOT_READ_ONLY'
  | 'DESTRUCTIVE'
  | 'UNSUPPORTED_SCHEMA'
  | 'DUPLICATE_NAME';
export type HermesMcpDiscoveredTool = {
  name: string;
  title: string | null;
  authorized: boolean;
  callable: boolean;
  refusals: HermesMcpToolRefusal[];
  isDraftingTool: boolean;
};
export type HermesMcpDiscoveryResult = {
  status: 'NOT_CONFIGURED' | 'READY' | 'UNAVAILABLE';
  provider: 'HERMES_MCP';
  // Every name the operator granted, including ones the server never
  // advertised — a grant on an absent tool must stay visible, not silent.
  authorizedTools: string[];
  draftingTool: string | null;
  tools: HermesMcpDiscoveredTool[];
  truncated: boolean;
};
export const discoveryInputSchema = z
  .object({ workspaceId: z.string().uuid() })
  .strict();

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
