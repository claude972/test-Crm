export const HERMES_WHATSAPP_ENROLLMENT_STATES = [
  'NOT_CONFIGURED',
  'PROVISIONING',
  'PROVISIONING_UNCONFIRMED',
  'AWAITING_PAIRING',
  'CONNECTING',
  'PAIRED_PENDING_ACTIVATION',
  'ACTIVATING',
  'ACTIVE',
  'UNAVAILABLE',
  'BLOCKED',
] as const;

export type HermesWhatsappEnrollmentView = {
  state: (typeof HERMES_WHATSAPP_ENROLLMENT_STATES)[number];
  revision: number;
  providerState: 'open' | 'close' | 'connecting' | null;
  ingressEnabled: boolean;
  cutoffAt: string | null;
  botMode: 'OFF' | 'ASSISTED' | 'AUTO';
  reasonCode: string | null;
};

export type HermesWhatsappEnrollmentRead = {
  view: HermesWhatsappEnrollmentView;
  credential: {
    qrDataUrl: string | null;
    pairingCode: string | null;
    displayUntil: number;
  } | null;
};

export type HermesWhatsappEnrollmentOperation =
  | 'Start'
  | 'Qr'
  | 'Status'
  | 'Activate';
