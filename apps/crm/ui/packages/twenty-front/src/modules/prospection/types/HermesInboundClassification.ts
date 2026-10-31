import { type HermesPayloadProblem } from '@/prospection/types/HermesImportState';

// How the server classified one inbound item, as the frontend is allowed to
// know it.
//
// WHAT THIS SURFACE IS FOR. An operator looking at a reception needs to answer
// three questions without leaving the screen: where did this come from, which
// company does it belong to, and what does it already touch in the CRM. The
// server answers all three from the deterministic key of the receipt, so the
// attribution below is recomputed server-side, not read out of a mutable
// field.
//
// WHAT IT IS NOT. It is not a pipeline action and it never becomes one. A
// linked opportunity listed here ALREADY pointed at the contact; no inbound
// item creates one, and the surface must never suggest otherwise. The server
// states this explicitly on every answer, and this module keeps that statement
// as a field rather than an assumption so a future contract change cannot make
// the screen quietly start claiming a deal was opened.

// The three attributions the server distinguishes, kept apart on purpose.
//
// Collapsing these into "attributed" would destroy the only distinction that
// matters to an operator chasing a bad reception:
//
// - 'verified' — the stored record is the one this connection, provider and
//   event deterministically produce, and it still carries its receipt marker;
// - 'edited-receipt' — the record was found under that same deterministic key,
//   so the attribution holds, but its receipt marker is gone: somebody edited
//   it. The provenance is intact; the evidence of the original content is not;
// - 'not-attributable' — no signed connection accounts for it. A manual or
//   historical deposit is this, and so is anything the server could not tie to
//   a connection. It is NEVER shown as an automatic reception.
export const HERMES_ATTRIBUTIONS = [
  'verified',
  'edited-receipt',
  'not-attributable',
] as const;

export type HermesAttribution = (typeof HERMES_ATTRIBUTIONS)[number];

// A table, never a transform: an attribution outside the three the server
// publishes stays null and reads as "not published", so a fourth value cannot
// be silently rendered as one of these three.
export const readHermesAttribution = (
  value: unknown,
): HermesAttribution | null =>
  value === 'VERIFIED'
    ? 'verified'
    : value === 'EDITED_RECEIPT'
      ? 'edited-receipt'
      : value === 'NOT_ATTRIBUTABLE'
        ? 'not-attributable'
        : null;

// Which inbound path produced the item. Mapped explicitly for the same reason.
export const HERMES_INBOUND_SOURCES = ['forms', 'calendar', 'scraping'] as const;

export type HermesInboundSource = (typeof HERMES_INBOUND_SOURCES)[number];

export const readHermesInboundSource = (
  value: unknown,
): HermesInboundSource | null =>
  value === 'FORMS'
    ? 'forms'
    : value === 'CALENDAR'
      ? 'calendar'
      : value === 'SCRAPING'
        ? 'scraping'
        : null;

// The provenance of one inbound item. Every field is a defensive read, so null
// always means "the payload did not carry a usable value".
export type HermesInboundOrigin = {
  source: HermesInboundSource | null;
  // 'HEYFORM' or 'CAL_DIY' for a bridge receipt, null for a scraping deposit
  // which has no provider of its own.
  provider: string | null;
  // The signed connection the item is attributable to, and the company it
  // belongs to. Both come from the server's binding, never from a payload the
  // caller controls.
  connectionId: string | null;
  structureId: string | null;
  eventId: string | null;
  // The server's own marker for when it took the item in.
  receivedAt: string | null;
  attribution: HermesAttribution | null;
};

// What the item already touches in the CRM.
export type HermesInboundLinks = {
  personId: string | null;
  companyId: string | null;
  noteId: string | null;
  calendarEventId: string | null;
  // Always null for these paths: a form answer, a booking and a scraped row
  // have no messaging conversation. Kept as an explicit null rather than
  // omitted, so the screen says so instead of leaving a gap that reads as a
  // missing value.
  conversationId: string | null;
  // Opportunities that ALREADY point at this contact. Reading them is the
  // pipeline link. None of them was created by the inbound item.
  existingOpportunityIds: string[];
};

export type HermesInboundItem = {
  origin: HermesInboundOrigin;
  links: HermesInboundLinks;
  isContactLinked: boolean;
  // The server's explicit statement that no opportunity was created by this
  // item. Read, never assumed: if a future payload ever said otherwise, the
  // screen must report it rather than keep showing the reassuring text.
  automaticDealCreated: boolean | null;
};

// The real row outcomes of a scraping deposit, as stored. `duplicate` is the
// in-batch repeat of an email, `conflict` a row an existing record makes
// ambiguous, `suppressed` a durable opposition. Null when the payload did not
// carry a usable number — which is not zero.
export type HermesScrapingCounts = {
  total: number | null;
  pending: number | null;
  invalid: number | null;
  duplicate: number | null;
  suppressed: number | null;
  conflict: number | null;
  qualified: number | null;
};

export type HermesScrapingDeposit = {
  batchId: string | null;
  externalBatchId: string | null;
  origin: HermesInboundOrigin;
  counts: HermesScrapingCounts;
  // A deposit is never qualified on arrival: turning rows into contacts stays
  // an explicit human action. False would be a contract change worth showing,
  // so it is read rather than hardcoded.
  isQualificationRequired: boolean | null;
  linkedPersonIds: string[];
  linkedCompanyIds: string[];
};

// What the client knows about a classification, as opposed to what the
// classification says. The cases must never collapse:
//
// - 'denied' is an authorisation answer, not a failure;
// - 'not-configured' is a fact the server stated: this company has no signed
//   connection granting the matching source;
// - 'not-found' is also a fact: the receipt is unknown to this company. It is
//   not an error and it is not 'unreadable';
// - 'unreadable' is an absence of knowledge and never reads as any of the
//   above;
// - only 'classified' carries an item.
export type HermesInboundItemReadState =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'not-configured' }
  | { kind: 'not-found' }
  | { kind: 'unreadable'; problem: HermesPayloadProblem }
  | { kind: 'classified'; item: HermesInboundItem };

export type HermesScrapingClassificationReadState =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'unreadable'; problem: HermesPayloadProblem }
  | {
      kind: 'classified';
      deposits: HermesScrapingDeposit[];
      automaticDealCreated: boolean | null;
    };

// One bridge receipt as a list read reports it. Every field is a defensive
// read, so null always means "the payload did not carry a usable value".
export type HermesInboundReceipt = {
  noteId: string | null;
  // 'HEYFORM' or 'CAL_DIY'. Null when the stored receipt no longer names a
  // provider the server knows, which it reports as unattributable rather than
  // assigning a source.
  provider: string | null;
  // The provider's own event identifier, which is what an operator matches
  // against the provider console. Only proven when attribution is 'verified'.
  eventId: string | null;
  // ALWAYS null on a list read: the receipt does not store the booking
  // identifier. It means unknown, never "this booking has no uid", and the
  // inspection below therefore reports no calendar record for a booking.
  bookingUid: string | null;
  connectionId: string | null;
  structureId: string | null;
  receivedAt: string | null;
  attribution: HermesAttribution | null;
};

// What the client knows about the receipts of this company.
//
// - 'denied' is an authorisation answer, not a failure;
// - 'not-configured' is a fact the server stated: no signed connection grants
//   Forms or Calendar, so nothing could be attributed and nothing was read;
// - 'unreadable' is an absence of knowledge and never reads as "no receipt";
// - only 'listed' carries receipts, and it carries `truncated` with them: a
//   page is a prefix, and an empty page is not proof of no receipt either,
//   because a receipt whose marker was edited away is found by no list read.
export type HermesInboundReceiptsReadState =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'not-configured' }
  | { kind: 'unreadable'; problem: HermesPayloadProblem }
  | {
      kind: 'listed';
      receipts: HermesInboundReceipt[];
      // When we asked. Not a claim that the page is still current.
      checkedAt: string | null;
      cap: number | null;
      truncated: boolean | null;
    };
