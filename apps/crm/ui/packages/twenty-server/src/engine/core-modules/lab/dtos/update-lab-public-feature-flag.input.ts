import { Field, InputType } from '@nestjs/graphql';

import { IsBoolean, IsNotEmpty } from 'class-validator';
import { FeatureFlagKey } from 'kovaa-lab-shared/types';

@InputType()
export class UpdateLabPublicFeatureFlagInput {
  @Field(() => String)
  @IsNotEmpty()
  publicFeatureFlag: FeatureFlagKey;

  @Field(() => Boolean)
  @IsBoolean()
  value: boolean;
}
