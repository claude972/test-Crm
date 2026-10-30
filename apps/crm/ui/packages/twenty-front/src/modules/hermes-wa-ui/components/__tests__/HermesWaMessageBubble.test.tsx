import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { HermesWaMessageBubble } from '@/hermes-wa-ui/components/HermesWaMessageBubble';
import { readHermesWaDeliveryState } from '@/hermes-wa-ui/types/HermesWaDelivery';
import { readHermesWaDirection } from '@/hermes-wa-ui/types/HermesWaDirection';
import { readHermesWaMediaKind } from '@/hermes-wa-ui/types/HermesWaMediaKind';

const renderBubble = (node: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

describe('HermesWaMessageBubble', () => {
  it('puts the time and the delivery state inside the bubble', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('OUTBOUND')}
        text="On passe demain à 9h."
        timeLabel="09:12"
        delivery={{
          state: readHermesWaDeliveryState('ACCEPTED'),
          errorCode: null,
        }}
      />,
    );

    expect(screen.getByText('09:12')).toBeInTheDocument();
    expect(screen.getByText(/accepted, delivery unknown/i)).toBeInTheDocument();
  });

  it('never claims a message was delivered', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('OUTBOUND')}
        text="Bien reçu."
        timeLabel="09:12"
        delivery={{
          state: readHermesWaDeliveryState('ACCEPTED'),
          errorCode: null,
        }}
      />,
    );

    expect(screen.queryByText(/^delivered$/i)).not.toBeInTheDocument();
  });

  it('says the direction in words, so the alignment is not the only signal', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('INBOUND')}
        text="Bonjour"
        timeLabel="08:40"
      />,
    );

    expect(screen.getByText('Received')).toBeInTheDocument();
  });

  it('does not lay an unreadable direction out as outgoing', () => {
    const { container } = renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('SIDEWAYS')}
        text="?"
        timeLabel="08:40"
      />,
    );

    expect(
      container.querySelector('[data-direction="outbound"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-direction="unknown"]'),
    ).not.toBeNull();
    // The server's own word, so the gap is reportable.
    expect(screen.getByText(/SIDEWAYS/)).toBeInTheDocument();
  });

  it('says the time is unknown rather than leaving the slot blank', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('INBOUND')}
        text="Bonjour"
        timeLabel={null}
      />,
    );

    expect(screen.getByText(/time unknown/i)).toBeInTheDocument();
  });

  it('does not render a message with no content as an empty bubble', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('INBOUND')}
        text="   "
        timeLabel="08:40"
      />,
    );

    expect(screen.getByText(/no content in this message/i)).toBeInTheDocument();
  });

  it('drops the "no content" line when a media fills the bubble instead', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('INBOUND')}
        text={null}
        timeLabel="08:40"
      >
        <span>attachment slot</span>
      </HermesWaMessageBubble>,
    );

    expect(screen.getByText('attachment slot')).toBeInTheDocument();
    expect(
      screen.queryByText(/no content in this message/i),
    ).not.toBeInTheDocument();
  });

  it('marks an unread message in words, not only with a tint', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('INBOUND')}
        text="Bonjour"
        timeLabel="08:40"
        isUnread
      />,
    );

    expect(screen.getByText('Unread')).toBeInTheDocument();
  });

  it('shows a quote, and says so when the quoted message is not available', () => {
    const { rerender } = renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('OUTBOUND')}
        text="Oui, 9h."
        timeLabel="09:12"
        quote={{
          authorLabel: 'Camille Roux',
          text: 'Vous passez demain ?',
          mediaKind: null,
        }}
      />,
    );

    expect(screen.getByText('Camille Roux')).toBeInTheDocument();
    expect(screen.getByText('Vous passez demain ?')).toBeInTheDocument();

    rerender(
      <I18nProvider i18n={i18n}>
        <HermesWaMessageBubble
          direction={readHermesWaDirection('OUTBOUND')}
          text="Oui, 9h."
          timeLabel="09:12"
          quote={{ authorLabel: null, text: null, mediaKind: null }}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/sender unknown/i)).toBeInTheDocument();
    expect(screen.getByText(/quoted message not available/i)).toBeInTheDocument();
  });

  it('names the quoted media when the quote had no text', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('OUTBOUND')}
        text="Reçu."
        timeLabel="09:12"
        quote={{
          authorLabel: 'Camille Roux',
          text: null,
          mediaKind: readHermesWaMediaKind('VOICE'),
        }}
      />,
    );

    expect(screen.getByText('Voice message')).toBeInTheDocument();
  });

  it('shows an unreadable delivery state verbatim instead of guessing one', () => {
    renderBubble(
      <HermesWaMessageBubble
        direction={readHermesWaDirection('OUTBOUND')}
        text="Reçu."
        timeLabel="09:12"
        delivery={{
          state: readHermesWaDeliveryState('DELIVERED_MAYBE'),
          errorCode: 'PROVIDER_7',
        }}
      />,
    );

    expect(screen.getByText('DELIVERED_MAYBE')).toBeInTheDocument();
    expect(screen.getByText('PROVIDER_7')).toBeInTheDocument();
  });
});
