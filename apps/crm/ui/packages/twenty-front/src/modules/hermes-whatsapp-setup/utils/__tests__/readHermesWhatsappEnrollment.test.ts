import { readHermesWhatsappEnrollment } from '@/hermes-whatsapp-setup/utils/readHermesWhatsappEnrollment';

const NOW = Date.parse('2026-11-01T01:00:00Z');
const view = {
  state: 'AWAITING_PAIRING',
  revision: 2,
  providerState: 'connecting',
  ingressEnabled: false,
  cutoffAt: null,
  botMode: 'OFF',
  reasonCode: null,
};
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

describe('readHermesWhatsappEnrollment', () => {
  it('keeps association, reception and the real bot policy distinct', () => {
    expect(
      readHermesWhatsappEnrollment(
        { ...view, providerState: 'open', botMode: 'AUTO' },
        NOW,
      )?.view,
    ).toMatchObject({
      providerState: 'open',
      ingressEnabled: false,
      botMode: 'AUTO',
    });
  });

  it.each([
    null,
    {},
    { ...view, revision: -1 },
    { ...view, state: 'CONNECTED' },
    { ...view, botMode: undefined },
    { ...view, qrDataUrl: 'https://other.example/qr.png' },
    { ...view, qrDataUrl: png },
    { ...view, qrDataUrl: png, expiresAt: '2026-11-01T01:05:00Z' },
  ])('refuses an unusable or unsafe response %#', (value) => {
    expect(readHermesWhatsappEnrollment(value, NOW)).toBeNull();
  });

  it('keeps a bounded display lease and drops expired QR and code together', () => {
    const response = {
      ...view,
      qrDataUrl: png,
      pairingCode: 'ABCD-EFGH',
      expiresAt: '2026-11-01T01:01:00Z',
    };
    expect(readHermesWhatsappEnrollment(response, NOW)?.credential).toEqual({
      qrDataUrl: png,
      pairingCode: 'ABCD-EFGH',
      displayUntil: NOW + 60_000,
    });
    expect(
      readHermesWhatsappEnrollment(response, NOW + 60_001)?.credential,
    ).toBeNull();
  });
});
