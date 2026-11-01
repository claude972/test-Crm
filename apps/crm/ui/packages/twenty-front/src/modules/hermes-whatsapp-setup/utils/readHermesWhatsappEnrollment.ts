import { z } from 'zod';

import {
  HERMES_WHATSAPP_ENROLLMENT_STATES,
  type HermesWhatsappEnrollmentRead,
} from '@/hermes-whatsapp-setup/types/HermesWhatsappEnrollment';

const schema = z.object({
  state: z.enum(HERMES_WHATSAPP_ENROLLMENT_STATES),
  revision: z.number().int().nonnegative().max(2_147_483_647),
  providerState: z.enum(['open', 'close', 'connecting']).nullable(),
  ingressEnabled: z.boolean(),
  cutoffAt: z.string().datetime({ offset: true }).nullable(),
  botMode: z.enum(['OFF', 'ASSISTED', 'AUTO']),
  reasonCode: z
    .string()
    .max(100)
    .regex(/^[A-Z0-9_]+$/)
    .nullable(),
  qrDataUrl: z
    .string()
    .max(262_144)
    .regex(/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/)
    .nullish(),
  pairingCode: z
    .string()
    .regex(/^[A-Za-z0-9 -]{4,32}$/)
    .nullish(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
});

export const readHermesWhatsappEnrollment = (
  value: unknown,
  now: number = Date.now(),
): HermesWhatsappEnrollmentRead | null => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  const { qrDataUrl, pairingCode, expiresAt, ...view } = parsed.data;
  const hasCredential = Boolean(qrDataUrl || pairingCode);
  const displayUntil = expiresAt ? Date.parse(expiresAt) : NaN;
  // This is an application display lease, never a WhatsApp validity promise.
  if (
    hasCredential &&
    (!Number.isFinite(displayUntil) || displayUntil > now + 120_000)
  )
    return null;
  return {
    view,
    credential:
      hasCredential && displayUntil > now
        ? {
            qrDataUrl: qrDataUrl ?? null,
            pairingCode: pairingCode ?? null,
            displayUntil,
          }
        : null,
  };
};
