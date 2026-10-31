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
        audiencesLoad={{
          kind: 'ready',
          value: [
            { id: 'list-1', name: 'Architects, Lyon', description: null },
          ],
        }}
        onRetryAudiences={jest.fn()}
        selectedListId="list-1"
        onSelectList={jest.fn()}
        listSaveState={{ kind: 'idle' }}
        hasMoreAudiences={false}
        isLoadingMoreAudiences={false}
        onLoadMoreAudiences={jest.fn()}
        unsubscribeTopics={[
          { id: 'topic-b2b', name: 'B2B prospecting', description: null },
        ]}
        selectedTopicId="topic-b2b"
        onSelectTopic={jest.fn()}
        topicSaveState={{ kind: 'idle' }}
        isSenderRecorded
        content={{ subject: 'Rethink your shopfront', body: 'Hello {{city}}' }}
        onContentChange={jest.fn()}
        contentSaveState={{ kind: 'idle' }}
        onSaveContent={jest.fn()}
        senderSaveState={{ kind: 'idle' }}
        previewState={{ kind: 'idle' }}
        previewRecipients={[
          {
            id: 'person-1',
            label: 'Camille Roy',
            address: 'camille.roy@atelier-fontaine.fr',
          },
        ]}
        selectedPreviewRecipientId="person-1"
        onSelectPreviewRecipient={jest.fn()}
        testDestination="recette@atelier-fontaine.fr"
        onTestDestinationChange={jest.fn()}
        scheduleDraft={{
          date: '2026-11-04',
          time: '09:00',
          timeZone: 'Europe/Paris',
        }}
        onScheduleDraftChange={jest.fn()}
        timeZones={['Europe/Paris', 'UTC']}
        scheduledAt={null}
        actionOutcome={null}
        hasUncertainEmission={false}
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
    // Deliberately changed: the server validates the test destination as an
    // e-mail address and applies no staging allowlist, so the old
    // "staging destinations only" label asserted a restriction that does not
    // exist. The label now names what really happens.
    expect(
      screen.getByText('Real emission · to the address you typed'),
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

    // Deliberately changed. These radios used to be disabled, which was the
    // dead end: every identity other than the one already on the campaign
    // arrives with no server verdict, so a draft with no sender could never
    // be given one and an existing sender could never be changed. Choosing a
    // sender records it on the campaign and emits nothing, so it stays
    // available; the refusal above is about emitting and the emitting steps
    // still enforce it, which the next test asserts.
    for (const address of [
      'commercial@atelier-fontaine.fr',
      'promo@atelier-fontaine.fr',
    ]) {
      expect(screen.getByRole('radio', { name: address })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      );
    }

    expect(
      screen.getAllByText(
        'Refused for sending, not for choosing: this mailbox can still be recorded on the campaign, and the server is asked again about the address it actually holds.',
      ).length,
    ).toBe(2);
  });

  it('cannot record an identity the server published no address for', () => {
    renderScreen({
      senderIdentitiesLoad: {
        kind: 'ready',
        value: [{ ...delegatedIdentity, id: 'si-4', displayedAddress: null }],
      },
      selectedIdentityId: null,
    });

    expect(
      screen.getByText(
        'This identity cannot be recorded: the server published no address for it, so there is nothing to store as the sender.',
      ),
    ).toBeVisible();
  });

  it('refuses every emitting step when the chosen identity is refused', () => {
    renderScreen({ selectedIdentityId: 'si-3' });

    expect(
      screen.getByRole('button', { name: 'Send the test to this address' }),
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

  it('says the content is not recorded yet rather than letting it look saved', () => {
    renderScreen({ contentSaveState: { kind: 'unsaved' } });

    expect(
      screen.getByText(
        'Not recorded yet: what is on screen differs from what the server holds.',
      ),
    ).toBeVisible();
  });

  it('offers a wired control to record the content', () => {
    const onSaveContent = jest.fn();

    renderScreen({ contentSaveState: { kind: 'unsaved' }, onSaveContent });

    const saveButton = screen.getByRole('button', {
      name: 'Record the content',
    });

    expect(saveButton).toHaveAttribute('aria-disabled', 'false');

    saveButton.click();

    expect(onSaveContent).toHaveBeenCalledTimes(1);
  });

  it('shuts the recording control when the content does not pass its checks', () => {
    renderScreen({
      content: { subject: '', body: '' },
      contentSaveState: { kind: 'unsaved' },
    });

    expect(
      screen.getByRole('button', { name: 'Record the content' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Fix the problems listed above before recording.'),
    ).toBeVisible();
  });

  it('reports a recording whose outcome is unknown without offering a retry', () => {
    renderScreen({
      contentSaveState: {
        kind: 'unconfirmed',
        reasonCode: 'FAILED',
        reason: null,
      },
    });

    expect(
      screen.getByText('The outcome of this recording is not known.'),
    ).toBeVisible();
    expect(
      screen.getByText(
        'It may or may not have been recorded. Reload the campaign to see what the server holds before editing again — nothing is retried on its own, on purpose.',
      ),
    ).toBeVisible();
  });

  it('shuts the test until a destination is typed, and never implies one', () => {
    renderScreen({ testDestination: '' });

    expect(
      screen.getByRole('button', { name: 'Send the test to this address' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Type the destination of the test first.'),
    ).toBeVisible();
  });

  it('shuts the test when what was typed cannot be an address', () => {
    renderScreen({ testDestination: 'not-an-address' });

    expect(
      screen.getByRole('button', { name: 'Send the test to this address' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('warns that the server does not restrict the test destination', () => {
    renderScreen();

    expect(
      screen.getByText(
        /The server applies no staging restriction to it, so never type a prospect.s address here\./,
      ),
    ).toBeVisible();
  });

  // The capability list used to promise the server restricted the test to
  // pre-production destinations and never to a prospect. It does not: the
  // server validates `toAddress` as an address and sends there. The two
  // sections now say the same true thing, and this test fails if the
  // promise comes back.
  it('never promises a pre-production guard the server does not apply', () => {
    renderScreen();

    expect(
      screen.getByText(
        'One real message goes to the address you type. The server applies no staging restriction to it, so the destination is yours to answer for.',
      ),
    ).toBeVisible();

    for (const falsePromise of [
      /restricted by the server to staging destinations/i,
      /restricted by the server to pre-production/i,
      /never to a prospect/i,
    ]) {
      expect(screen.queryByText(falsePromise)).not.toBeInTheDocument();
    }
  });

  it('shuts every emitting step after an emission whose outcome is unknown', () => {
    renderScreen({
      hasUncertainEmission: true,
      capabilitiesLoad: {
        kind: 'ready',
        value: {
          ...capabilities,
          send: { allowed: true, reasonCode: null, reason: null },
        },
      },
      actionOutcome: {
        kind: 'unconfirmed',
        action: 'send',
        reasonCode: 'FAILED',
        reason: null,
      },
    });

    for (const name of [
      'Send the campaign now',
      'Send the test to this address',
    ]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    }

    expect(
      screen.getAllByText('PREVIOUS_EMISSION_OUTCOME_UNKNOWN').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('Send the campaign now \u2014 outcome unknown.'),
    ).toBeVisible();
  });

  it('shuts the preview until a recipient is chosen', () => {
    renderScreen({ selectedPreviewRecipientId: null });

    expect(
      screen.getByRole('button', { name: 'Render a recipient preview' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows an excluded recipient rather than hiding the rendering', () => {
    renderScreen({
      previewState: {
        kind: 'ready',
        preview: {
          recipientLabel: null,
          recipientAddress: 'camille.roy@atelier-fontaine.fr',
          subject: 'Rethink your shopfront',
          body: 'Hello Nantes',
          missingVariables: [],
          variablesUsed: ['city'],
          isRecipientSendable: false,
          exclusionReason: 'GLOBALLY_UNSUBSCRIBED',
          envelope: {
            fromAddress: 'contact@atelier-fontaine.fr',
            senderStatus: 'DOMAIN_PREREQUISITES_MET',
            openMarkerWouldBeIncluded: false,
            clickTrackingWouldBeApplied: false,
            unsubscribeLinkWouldBeIncluded: true,
          },
        },
      },
    });

    expect(
      screen.getByText(
        'This recipient is currently excluded, so a send would skip them. The rendering is shown anyway.',
      ),
    ).toBeVisible();
    expect(screen.getByText('GLOBALLY_UNSUBSCRIBED')).toBeVisible();
    // The rendering itself is still shown.
    expect(screen.getByText('Hello Nantes')).toBeVisible();
  });

  it('keeps the preview inert and says so, so no open can be fabricated', () => {
    renderScreen({
      previewState: {
        kind: 'ready',
        preview: {
          recipientLabel: null,
          recipientAddress: 'camille.roy@atelier-fontaine.fr',
          subject: 'Rethink your shopfront',
          body: 'Hello Nantes',
          missingVariables: [],
          variablesUsed: [],
          isRecipientSendable: true,
          exclusionReason: null,
          envelope: null,
        },
      },
    });

    expect(
      screen.getByText(
        /Shown as plain text on purpose: the panel stays inert/,
      ),
    ).toBeVisible();
    // Nothing in the panel loads a remote resource, so no tracking marker of
    // the real recipient can be requested by looking at a preview.
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });

  // CJ-CAMPAIGN-011, second place. The audience picker capped at its page
  // size too, so the remaining lists could not be selected at all.
  it('offers the next page of audience lists', () => {
    const onLoadMoreAudiences = jest.fn();

    renderScreen({ hasMoreAudiences: true, onLoadMoreAudiences });

    const moreButton = screen.getByRole('button', {
      name: 'Show more audience lists',
    });

    moreButton.click();

    expect(onLoadMoreAudiences).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        'Not every list this company holds is shown yet. Read the rest before concluding the one you want is missing.',
      ),
    ).toBeVisible();
  });

  it('offers no audience page control when every list is already shown', () => {
    renderScreen({ hasMoreAudiences: false });

    expect(
      screen.queryByRole('button', { name: 'Show more audience lists' }),
    ).not.toBeInTheDocument();
  });

  it('says a campaign with no list yet has no recipients, next to the control', () => {
    renderScreen({ selectedListId: null });

    expect(
      screen.getByText(
        'This campaign has no audience list yet, so it has no recipients at all. Choose one here.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('Audience list')).toBeVisible();
  });
});
