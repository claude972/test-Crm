import { ArgsType, Field } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';
import { Manifest } from 'kovaa-lab-shared/application';

@ArgsType()
export class ApplicationInput {
  @Field(() => GraphQLJSON, { nullable: false })
  manifest: Manifest;

  @Field(() => Boolean, { nullable: true })
  dryRun?: boolean;

  @Field(() => Boolean, { nullable: true })
  inferDeletionFromMissingEntities?: boolean;
}
