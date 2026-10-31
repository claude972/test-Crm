import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HermesInboundOrigin {
  // Which inbound path produced the item.
  @Field(() => String) source: 'FORMS' | 'CALENDAR' | 'SCRAPING';
  @Field(() => String, { nullable: true }) provider:
    | 'HEYFORM'
    | 'CAL_DIY'
    | null;
  // The signed connection this item is attributable to, and the company it
  // belongs to. Both come from the server-side binding, never from a payload.
  @Field(() => String, { nullable: true }) connectionId: string | null;
  @Field(() => String) structureId: string;
  @Field(() => String, { nullable: true }) eventId: string | null;
  @Field(() => String, { nullable: true }) receivedAt: string | null;
  // VERIFIED means the stored receipt's identifier matches the one this
  // connection, provider and event deterministically produce, so the
  // attribution is recomputed rather than trusted. EDITED_RECEIPT means the
  // record was found but no longer carries its original receipt marker.
  @Field(() => String) attribution:
    | 'VERIFIED'
    | 'EDITED_RECEIPT'
    | 'NOT_ATTRIBUTABLE';
}

@ObjectType()
export class HermesInboundLinks {
  @Field(() => String, { nullable: true }) personId: string | null;
  @Field(() => String, { nullable: true }) companyId: string | null;
  @Field(() => String, { nullable: true }) noteId: string | null;
  @Field(() => String, { nullable: true }) calendarEventId: string | null;
  // Forms, bookings and scraping rows have no messaging conversation. This
  // stays null instead of inventing one; mail and WhatsApp carry their own
  // conversation identity on the inbox conversation read.
  @Field(() => String, { nullable: true }) conversationId: string | null;
  // Opportunities that already point at this contact. Reading them is how the
  // pipeline link is reported; none is ever created by an inbound item.
  @Field(() => [String]) existingOpportunityIds: string[];
}

@ObjectType()
export class HermesInboundItemClassification {
  @Field(() => String) status: 'CLASSIFIED' | 'NOT_FOUND' | 'NOT_CONFIGURED';
  @Field(() => String) checkedAt: string;
  @Field(() => HermesInboundOrigin, { nullable: true })
  origin: HermesInboundOrigin | null;
  @Field(() => HermesInboundLinks, { nullable: true })
  links: HermesInboundLinks | null;
  @Field(() => String) contactState: 'LINKED' | 'UNLINKED';
  // Attested, not computed from a single read: no inbound path creates an
  // opportunity. The regression suite asserts the exact native write set.
  @Field(() => Boolean) automaticDealCreated: boolean;
}

// The native row outcomes, reported as they are stored. `duplicate` is the
// in-batch repeat of an email, `conflict` a row an existing contact or company
// makes ambiguous, and `suppressed` a durable opposition.
@ObjectType()
export class HermesScrapingRowCounts {
  @Field(() => Number) total: number;
  @Field(() => Number) pending: number;
  @Field(() => Number) invalid: number;
  @Field(() => Number) duplicate: number;
  @Field(() => Number) suppressed: number;
  @Field(() => Number) conflict: number;
  @Field(() => Number) qualified: number;
}

@ObjectType()
export class HermesScrapingBatchClassification {
  @Field(() => String) batchId: string;
  @Field(() => String) externalBatchId: string;
  @Field(() => HermesInboundOrigin) origin: HermesInboundOrigin;
  @Field(() => HermesScrapingRowCounts) counts: HermesScrapingRowCounts;
  // A deposit is never qualified on arrival: turning rows into contacts stays
  // an explicit human action.
  @Field(() => Boolean) qualificationRequired: boolean;
  @Field(() => [String]) linkedPersonIds: string[];
  @Field(() => [String]) linkedCompanyIds: string[];
}

@ObjectType()
export class HermesScrapingClassification {
  @Field(() => String) checkedAt: string;
  @Field(() => String) structureId: string;
  @Field(() => [HermesScrapingBatchClassification])
  batches: HermesScrapingBatchClassification[];
  @Field(() => Boolean) automaticDealCreated: boolean;
}

@ObjectType()
export class HermesInboundReceipt {
  @Field(() => String) noteId: string;
  // Null when the stored receipt no longer names a provider this build knows.
  // The row is then reported as unattributable rather than given a source.
  @Field(() => String, { nullable: true }) provider:
    | 'HEYFORM'
    | 'CAL_DIY'
    | null;
  // The provider's own event identifier, so an operator can match the receipt
  // against the provider console. It is only proven when VERIFIED below.
  @Field(() => String, { nullable: true }) eventId: string | null;
  // The receipt never stores the booking identifier, so a list read cannot
  // name it. Null means unknown here, never "this booking has no uid".
  @Field(() => String, { nullable: true }) bookingUid: string | null;
  @Field(() => String, { nullable: true }) connectionId: string | null;
  @Field(() => String) structureId: string;
  // The time the provider reported, read from the receipt body.
  @Field(() => String, { nullable: true }) receivedAt: string | null;
  // VERIFIED means the stored row was reached under the identifier this
  // company, connection, provider and event deterministically produce, so the
  // attribution is recomputed rather than trusted.
  @Field(() => String) attribution: 'VERIFIED' | 'NOT_ATTRIBUTABLE';
}

@ObjectType()
export class HermesInboundReceiptPage {
  @Field(() => String) status: 'LISTED' | 'NOT_CONFIGURED';
  // When we asked, not a claim that the page is still current.
  @Field(() => String) checkedAt: string;
  @Field(() => Int) cap: number;
  // True when more receipts exist than the cap returns: the page is a prefix,
  // never the whole set. A receipt whose body lost its marker is found by no
  // list read at all, so absence from this page is not absence of a receipt.
  @Field(() => Boolean) truncated: boolean;
  @Field(() => [HermesInboundReceipt]) receipts: HermesInboundReceipt[];
}
