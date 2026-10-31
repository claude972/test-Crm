import { Field, ObjectType } from '@nestjs/graphql';

// The envelope the preview resolved, sender identity included. Codes are plain
// strings from a closed set, matching MessageCampaignSendBlockerDTO.code, so the
// generated GraphQL schema gains no new enum.
@ObjectType()
export class MessageCampaignPreviewEnvelopeDTO {
  // Null when the campaign has no sender persisted yet.
  @Field(() => String, { nullable: true })
  fromAddress: string | null;

  // DOMAIN_PREREQUISITES_MET | NOT_PERSISTED | DOMAIN_NOT_VERIFIED |
  // UNSUBSCRIBE_HOSTNAME_NOT_READY. These name emailing-domain rows only: the
  // mailbox, connected account and transport are NOT inspected here, so no
  // value may be read as "the provider can send".
  @Field(() => String)
  senderStatus: string;

  // Whether an open marker would be *embedded* for this recipient. A fetched
  // marker proves an image was loaded, which is not a certain read, so this
  // must never be presented as an "opened" or "read" status.
  @Field(() => Boolean)
  openMarkerWouldBeIncluded: boolean;

  @Field(() => Boolean)
  clickTrackingWouldBeApplied: boolean;

  @Field(() => Boolean)
  unsubscribeLinkWouldBeIncluded: boolean;
}

@ObjectType()
export class MessageCampaignRecipientPreviewDTO {
  @Field(() => String)
  personId: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  subject: string;

  @Field(() => String)
  html: string;

  @Field(() => String)
  plainText: string;

  @Field(() => [String])
  variablesUsed: string[];

  // False still renders the content, so the operator sees what the message
  // would say while knowing this person would not receive it.
  @Field(() => Boolean)
  isRecipientSendable: boolean;

  // Null when sendable; otherwise HARD_SUPPRESSED | GLOBALLY_UNSUBSCRIBED |
  // TOPIC_UNSUBSCRIBED | NO_EMAIL | NOT_IN_AUDIENCE. A person outside the
  // campaign's list is refused outright, so it never appears here.
  @Field(() => String, { nullable: true })
  recipientExclusionReason: string | null;

  @Field(() => MessageCampaignPreviewEnvelopeDTO)
  envelope: MessageCampaignPreviewEnvelopeDTO;
}
