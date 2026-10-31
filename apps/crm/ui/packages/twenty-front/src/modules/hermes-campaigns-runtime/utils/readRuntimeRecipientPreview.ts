import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesCampaignPreviewEnvelope,
  type HermesCampaignRecipientPreview,
} from '@/hermes-campaigns-ui/types/HermesCampaignContent';

export type HermesRuntimeRecipientPreviewRead =
  | { kind: 'read'; value: HermesCampaignRecipientPreview }
  // The answer was not shaped like a preview. Reported as unreadable, never
  // rendered as an empty preview: an empty rendering of a real campaign and
  // an answer nobody could parse are different facts.
  | { kind: 'unreadable' };

// Only a string with something in it is a published value.
const readText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

// A published boolean, or null. A missing flag is not a false: "we did not
// say" and "no" read differently next to a tracking marker.
const readFlag = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const readEnvelope = (value: unknown): HermesCampaignPreviewEnvelope | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const envelope = value as Record<string, unknown>;

  return {
    fromAddress: readText(envelope.fromAddress),
    senderStatus: readText(envelope.senderStatus),
    openMarkerWouldBeIncluded: readFlag(envelope.openMarkerWouldBeIncluded),
    clickTrackingWouldBeApplied: readFlag(
      envelope.clickTrackingWouldBeApplied,
    ),
    unsubscribeLinkWouldBeIncluded: readFlag(
      envelope.unsubscribeLinkWouldBeIncluded,
    ),
  };
};

const readVariablesUsed = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => isNonEmptyString(entry))
    : [];

// Reads what `previewMessageCampaignRecipient` published into the shape the
// screen renders.
//
// The body comes from `plainText`, never from `html`. The panel has to stay
// inert: rendering the HTML would execute it, load its remote images and
// fetch the recipient's own tracking pixel, which would record an open that
// nobody performed. A preview must not be able to manufacture a measurement.
//
// Nothing is defaulted into a reassuring value. A missing subject reads as an
// empty subject because that is what would be sent; a missing sendability
// flag reads as unknown, not as sendable.
export const readRuntimeRecipientPreview = (
  payload: unknown,
): HermesRuntimeRecipientPreviewRead => {
  if (typeof payload !== 'object' || payload === null) {
    return { kind: 'unreadable' };
  }

  const preview = payload as Record<string, unknown>;

  // A preview that names neither a person nor an address is not a
  // per-recipient preview, whatever else it carries.
  const personId = readText(preview.personId);
  const email = readText(preview.email);

  if (!isDefined(personId) && !isDefined(email)) {
    return { kind: 'unreadable' };
  }

  return {
    kind: 'read',
    value: {
      // The operation publishes the person's id and address, not a display
      // name, so no name is invented here: the address is what is shown.
      recipientLabel: null,
      recipientAddress: email,
      subject: readText(preview.subject) ?? '',
      body: readText(preview.plainText) ?? '',
      // The operation publishes the variables it used, not the ones left
      // without a value, so nothing is claimed to be missing.
      missingVariables: [],
      variablesUsed: readVariablesUsed(preview.variablesUsed),
      isRecipientSendable: readFlag(preview.isRecipientSendable),
      exclusionReason: readText(preview.recipientExclusionReason),
      envelope: readEnvelope(preview.envelope),
    },
  };
};
