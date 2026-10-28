import { Field, ObjectType } from '@nestjs/graphql';

import { Column } from 'typeorm';
import { FeatureFlagKey } from 'kovaa-lab-shared/types';

@ObjectType('FeatureFlag')
export class FeatureFlagDTO {
  @Field(() => FeatureFlagKey)
  @Column({ nullable: false, type: 'text' })
  key: FeatureFlagKey;

  @Field()
  @Column({ nullable: false })
  value: boolean;
}
