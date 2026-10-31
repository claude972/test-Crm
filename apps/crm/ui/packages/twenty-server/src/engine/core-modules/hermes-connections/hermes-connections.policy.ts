import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { parseEvolutionConnections } from 'src/engine/core-modules/hermes-connectors/evolution/evolution-connection.schema';
import { parseHermesMcpConnections } from 'src/engine/core-modules/hermes-prospection/intake/mcp/hermes-mcp.schema';
import { type HermesConnectionKind } from './hermes-connection.entity';

export const connectionKind = z.enum(['EVOLUTION', 'MAIL', 'MCP', 'INTAKE']);
const printable = z
  .string()
  .min(1)
  .max(4096)
  .regex(/^[\x21-\x7e]+$/);
const source = z.enum(['SCRAPING', 'FORMS', 'CALENDAR']);
const intake = z
  .object({
    allowedSources: z.array(source).min(1).max(3),
    maxRequestsPerMinute: z.number().int().min(1).max(60),
  })
  .strict();
const mail = z
  .object({
    connectedAccountId: z.string().uuid(),
    mailbox: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[^\r\n\x00]+$/),
  })
  .strict();

export type HermesConnectionConfiguration = {
  settings: Record<string, unknown>;
  secrets: Record<string, string>;
};

export function validateConnectionConfiguration(
  workspaceId: string,
  kind: HermesConnectionKind,
  configuration: HermesConnectionConfiguration,
): HermesConnectionConfiguration {
  try {
    const value = configuration.settings;
    const secrets = configuration.secrets;
    if (Buffer.byteLength(JSON.stringify(configuration)) > 20000)
      throw new Error();
    if (kind === 'EVOLUTION') {
      const secret = z
        .object({
          apiKey: printable,
          webhookSecret: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict()
        .parse(secrets);
      if (secret.apiKey === secret.webhookSecret) throw new Error();
      const parsed = parseEvolutionConnections(
        JSON.stringify({ [workspaceId]: { ...value, apiKey: secret.apiKey } }),
      )[workspaceId];
      return {
        settings: {
          baseUrl: parsed.baseUrl,
          instanceName: parsed.instanceName,
        },
        secrets: secret,
      };
    }
    if (kind === 'MCP') {
      const secret = z
        .object({ token: printable.min(32) })
        .strict()
        .parse(secrets);
      const parsed = parseHermesMcpConnections(
        JSON.stringify({ [workspaceId]: { ...value, token: secret.token } }),
      )[workspaceId];
      const { token: _token, ...settings } = parsed;
      return { settings, secrets: secret };
    }
    if (kind === 'MAIL') {
      if (Object.keys(secrets).length) throw new Error();
      return { settings: mail.parse(value), secrets: {} };
    }
    return {
      settings: intake.parse(value),
      secrets: z
        .object({ secret: z.string().regex(/^[a-f0-9]{64}$/) })
        .strict()
        .parse(secrets),
    };
  } catch {
    throw new BadRequestException('CONNECTION_CONFIGURATION_INVALID');
  }
}

export function connectionIdentity(
  kind: HermesConnectionKind,
  settings: Record<string, unknown>,
): string {
  const identity =
    kind === 'EVOLUTION'
      ? [settings.baseUrl, settings.instanceName]
      : kind === 'MCP'
        ? [
            settings.endpoint,
            settings.toolName,
            settings.protocolVersion,
            settings.argumentMap,
            // Widening what the bot may call without consent is an identity
            // change: it rotates the connection ID so old conversation and
            // ledger context is not reused, and it forces the secrets to be
            // supplied again. Appended only when present, so records stored
            // before this field keep their digest and still resolve.
            ...(settings.authorizedTools === undefined
              ? []
              : [settings.authorizedTools]),
          ]
        : kind === 'MAIL'
          ? [settings.connectedAccountId, settings.mailbox, settings.handle]
          : ['INTAKE'];
  return createHash('sha256')
    .update(JSON.stringify([kind, identity]))
    .digest('hex');
}

export function connectionSecretHash(
  kind: HermesConnectionKind,
  secrets: Record<string, string>,
): string | null {
  if (kind === 'MAIL') return null;
  const token =
    kind === 'EVOLUTION'
      ? secrets.webhookSecret
      : kind === 'MCP'
        ? secrets.token
        : secrets.secret;
  return createHash('sha256')
    .update(JSON.stringify(['hermes-connection-secret-v1', kind, token]))
    .digest('hex');
}
