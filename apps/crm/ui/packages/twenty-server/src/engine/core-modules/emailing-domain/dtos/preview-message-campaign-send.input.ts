import { Field, InputType } from '@nestjs/graphql';

import { IsDate, IsOptional, IsUUID } from 'class-validator';

@InputType()
export class PreviewMessageCampaignSendInput {
  @Field(() => String)
  @IsUUID()
  campaignId: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  scheduledAt?: Date;
}
