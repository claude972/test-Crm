import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import {
  HermesCampaignScreen,
  type HermesCampaignScreenProps,
} from '@/hermes-campaigns-ui/components/HermesCampaignScreen';
import { type HermesCampaignCapabilities } from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import { type HermesSenderIdentity } from '@/hermes-campaigns-ui/types/HermesSenderIdentity';

const delegatedIdentity: HermesSenderIdentity = {
  id: 'si-1',
  displayedAddress: 'contact@atelier-fontaine.fr',
  domain: 'atelier-fontaine.fr',
  connectionLogin: 'smtp-user-7',
  delegatedMailbox: {
    label: 'Main mailbox',
    address: 'contact@atelier-fontaine.fr',
    delegated: true,
    attestedAt: '2026-10-28T09:00:00.000Z',
    proof: null,
  },
  authorizedAliases: [],
  replyToAddress: null,
  state: 'verified',
  unknownState: null,
  serverVerdict: { allowed: true, reasonCode: null, reason: null },
};

const unverifiedIdentity: HermesSenderIdentity = {
  ...delegatedIdentity,
  id: 'si-2',
  displayedAddress: 'commercial@atelier-fontaine.fr',
  delegatedMailbox: {
    label: 'Not linked to a connected mailbox',
    address: null,
    delegated: false,
    attestedAt: null,
    proof: null,
  },
  state: 'unverified',
};

// Right domain, attested state, mailbox still not delegated: the case the
// identity section exists for.
const sameDomainNotDelegated: HermesSenderIdentity = {
  ...unverifiedIdentity,
  id: 'si-3',
  displayedAddress: 'promo@atelier-fontaine.fr',
  state: 'verified',
};

const capabilities: HermesCampaignCapabilities = {
  preview: { allowed: true, reasonCode: null, reason: null },
  testSynthetic: { allowed: true, reasonCode: null, reason: null },
  schedule: { allowed: true, reasonCode: null, reason: null },
  send: {
    allowed: false,
    reasonCode: 'CAPABILITY_UNAVAILABLE',
    reason: null,
  },
  cancel: { allowed: true, reasonCode: null, reason: null },
  checkedAt: '2026-10-30T11:12:00.000Z',
};

const renderScreen = (overrides: Partial<HermesCampaignScreenProps> = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <HermesCampaignScreen
        campaignName="Shopfitting — Loire-Atlantique"
        campaignState="draft"
        senderIdentitiesLoad={{
          kind: 'ready',
          value: [delegatedIdentity, unverifiedIdentity, sameDomainNotDelegated],
        }}
        selectedIdentityId="si-1"
        onSelectIdentity={jest.fn()}
        capabilitiesLoad={{ kind: 'ready', value: capabilities }}
        audienceLoad={{
          kind: 'ready',
          value: {
            retainedCount: 24,
            exclusions: [
              {
                reason: 'marketing-objection',
                unknownReason: null,
                count: 3,
              },
            ],
            variables: [{ name: 'city', missingCount: 5 }],
          },
        }}
        content={{ subject: 'Rethink your shopfront', body: 'Hello {{city}}' }}
        onContentChange={jest.fn()}
        previewState={{ kind: 'idle' }}
        scheduleDraft={{
          date: '2026-11-04',
          time: '09:00',
          timeZone: 'Europe/Paris',
        }}
        onScheduleDraftChange={jest.fn()}
        timeZones={['Europe/Paris', 'UTC']}
        scheduledAt={null}
        actionOutcome={null}
        onPreview={jest.fn()}
        onSendSyntheticTest={jest.fn()}
        onSchedule={jest.fn()}
        onCancelSchedule={jest.fn()}
        onSend={jest.fn()}
        resultsLoad={{
          kind: 'ready',
          value: [
            {
              evidence: 'SMTP_ACCEPTED',
              value: 0,
              unknownReason: null,
              note: null,
            },
            {
              evidence: 'PROVIDER_DELIVERED',
              value: null,
              unknownReason: 'provider-event-missing',
              note: null,
            },
          ],
        }}
        objectionsLoad={{ kind: 'empty' }}
        // oxlint-disable-next-line react/jsx-props-no-spreading
        {...overrides}
      />
    </I18nProvider>,
  );

describe('HermesCampaignScreen', () => {
  it('shuts a refused send, keeps it reachable and shows the reason in the page', () => {
    renderScreen();

    const sendButton = screen.getByRole('button', {
      name: 'Send the campaign now',
    });

    // aria-disabled rather than the disabled attribute: a disabled button
    // leaves the tab order, and its reason with it.
    expect(sendButton).toHaveAttribute('aria-disabled', 'true');
    // Once in the capability list, once next to the control it shuts.
    expect(screen.getAllByText('CAPABILITY_UNAVAILABLE')).toHaveLength(2);
  });

  it('names what each step really does to the outside world', () => {
    renderScreen();

    expect(screen.getAllByText('Emits nothing').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Real emission · staging destinations only'),
    ).toBeVisible();
    expect(
      screen.getByText('Real emission · to the retained recipients'),
    ).toBeVisible();
  });

  it('refuses the same domain without a delegation, with its reason', () => {
    renderScreen();

    expect(screen.getAllByText('Refused')).toHaveLength(2);
    expect(
      screen.getByText(
        'Right domain, but this mailbox is not delegated. A domain is not a mailbox.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText('This identity has no attested delegation yet.'),
    ).toBeVisible();

    for (const address of [
      'commercial@atelier-fontaine.fr',
      'promo@atelier-fontaine.fr',
    ]) {
      expect(
        screen.getByRole('radio', { name: address }),
      ).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('refuses every emitting step when the chosen identity is refused', () => {
    renderScreen({ selectedIdentityId: 'si-3' });

    expect(
      screen.getByRole('button', { name: 'Send a synthetic test' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getAllByText(
        'Unavailable: the sender identity this would run under is not authorised.',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('keeps a zero and an unknown measure apart in the results', () => {
    renderScreen();

    expect(screen.getByText('0')).toBeVisible();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
  });

  it('says it is reading rather than showing an empty screen', () => {
    renderScreen({
      senderIdentitiesLoad: { kind: 'loading' },
      capabilitiesLoad: { kind: 'loading' },
      audienceLoad: { kind: 'loading' },
      resultsLoad: { kind: 'loading' },
      objectionsLoad: { kind: 'loading' },
    });

    expect(screen.getAllByText('Reading…').length).toBe(5);
  });

  it('tells a product that was never configured apart from an empty one', () => {
    renderScreen({
      capabilitiesLoad: { kind: 'not-configured', detail: null },
    });

    expect(screen.getByText('Capabilities not computed yet')).toBeVisible();
  });

  it('shows a failed read as a failure, with its code', () => {
    renderScreen({
      audienceLoad: {
        kind: 'failed',
        reasonCode: 'AUDIENCE_READ_FAILED',
        reason: null,
      },
    });

    expect(screen.getByText('The audience could not be read')).toBeVisible();
    expect(screen.getByText('AUDIENCE_READ_FAILED')).toBeVisible();
  });

  it('offers no send control at all when the capabilities could not be read', () => {
    renderScreen({ capabilitiesLoad: { kind: 'empty' } });

    expect(
      screen.getByRole('button', { name: 'Send the campaign now' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
