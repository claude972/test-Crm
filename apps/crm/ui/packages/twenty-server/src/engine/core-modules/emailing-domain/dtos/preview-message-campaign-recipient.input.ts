import { Field, InputType } from '@nestjs/graphql';

import { IsOptional, IsUUID } from 'class-validator';

@InputType()
export class PreviewMessageCampaignRecipientInput {
  @Field(() => String)
  @IsUUID()
  campaignId: string;

  // Omitted means: render for the first sendable recipient of the resolved
  // audience, so the operator can preview without picking anyone.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  personId?: string;
}
