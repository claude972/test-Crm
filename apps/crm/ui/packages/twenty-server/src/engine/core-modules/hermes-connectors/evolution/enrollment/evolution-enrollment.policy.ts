import { createHash } from 'node:crypto';
import { z } from 'zod';

export const managedEvolutionSchema = z
  .object({
    version: z.literal(1),
    operationId: z.string().uuid(),
    phase: z.enum([
      'PROVISIONING',
      'PROVISIONING_UNCONFIRMED',
      'AWAITING_PAIRING',
      'ACTIVATING',
      'ACTIVE',
      'BLOCKED',
    ]),
    cutoffSeconds: z.number().int().safe().min(946684800).optional(),
  })
  .strict()
  .refine(
    (value) =>
      !['ACTIVATING', 'ACTIVE'].includes(value.phase) ||
      value.cutoffSeconds !== undefined,
  );
export type ManagedEvolution = z.infer<typeof managedEvolutionSchema>;
export type EvolutionEnrollmentView = {
  state:
    | 'NOT_CONFIGURED'
    | 'PROVISIONING'
    | 'PROVISIONING_UNCONFIRMED'
    | 'AWAITING_PAIRING'
    | 'CONNECTING'
    | 'PAIRED_PENDING_ACTIVATION'
    | 'ACTIVATING'
    | 'ACTIVE'
    | 'UNAVAILABLE'
    | 'BLOCKED';
  revision: number;
  providerState: 'open' | 'close' | 'connecting' | null;
  ingressEnabled: boolean;
  cutoffAt: string | null;
  botMode: 'OFF' | 'ASSISTED' | 'AUTO';
  reasonCode: string | null;
};
export type EvolutionEnrollmentQrView = EvolutionEnrollmentView & {
  qrDataUrl?: string;
  pairingCode?: string;
  expiresAt?: string;
};
export const enrollmentScopeSchema = z
  .object({ expectedRevision: z.number().int().min(0).max(2147483646) })
  .strict();
export const enrollmentQrSchema = enrollmentScopeSchema.extend({
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/)
    .optional(),
});
export const managedInstanceName = (workspaceId: string) => {
  z.string().uuid().parse(workspaceId);
  return (
    'kcrm-' +
    createHash('sha256')
      .update('hermes-managed-evolution-v1\0' + workspaceId)
      .digest('hex')
      .slice(0, 32)
  );
};
export function provisionerConfiguration(value: {
  enabled: unknown;
  baseUrl: unknown;
  apiKey: unknown;
}) {
  if (value.enabled !== true) return null;
  const base = z.string().max(2048).parse(value.baseUrl);
  const url = new URL(base);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('WA_PROVISIONER_CONFIGURATION_INVALID');
  const apiKey = z
    .string()
    .min(32)
    .max(4096)
    .regex(/^[\x21-\x7e]+$/)
    .parse(value.apiKey);
  return { baseUrl: url.origin, hostname: url.hostname, apiKey };
}
export function managedConnectionMatches(
  workspaceId: string,
  settings: Record<string, unknown>,
  baseUrl: string,
) {
  return (
    settings.baseUrl === baseUrl &&
    settings.instanceName === managedInstanceName(workspaceId)
  );
}
export function effectiveWhatsappMode(
  workspace: unknown,
  channel: unknown,
): 'OFF' | 'ASSISTED' | 'AUTO' {
  const parent = workspace ?? 'ASSISTED';
  const child =
    channel === undefined || channel === null || channel === 'INHERIT'
      ? parent
      : channel;
  const rank: Record<string, number> = { OFF: 0, ASSISTED: 1, AUTO: 2 };
  if (
    typeof parent !== 'string' ||
    typeof child !== 'string' ||
    !Object.prototype.hasOwnProperty.call(rank, parent) ||
    !Object.prototype.hasOwnProperty.call(rank, child)
  )
    return 'OFF';
  return (rank[parent] <= rank[child] ? parent : child) as
    | 'OFF'
    | 'ASSISTED'
    | 'AUTO';
}
