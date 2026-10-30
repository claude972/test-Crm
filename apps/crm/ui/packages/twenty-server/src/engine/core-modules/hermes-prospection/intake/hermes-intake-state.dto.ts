import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HermesIntakeSourcePolicy {
  @Field(() => String) source: 'SCRAPING' | 'FORMS' | 'CALENDAR';
  @Field(() => String) relativeEndpoint: string;
  @Field(() => Boolean) humanQualificationRequired: boolean;
  @Field(() => Boolean) nativeContactCreationEnabled: boolean;
}

@ObjectType()
export class HermesIntakeEndpointState {
  @Field(() => String) connectionId: string;
  @Field(() => String) structureId: string;
  @Field(() => String, { nullable: true }) structureName: string | null;
  @Field(() => String) label: string;
  @Field(() => Boolean, { nullable: true }) isAccepting: boolean | null;
  @Field(() => String, { nullable: true }) lastCollectionAt: string | null;
  @Field(() => String) providerState: 'CONFIGURED_UNVERIFIED' | 'DISABLED';
  @Field(() => String, { nullable: true }) errorCode: string | null;
  @Field(() => [HermesIntakeSourcePolicy]) sources: HermesIntakeSourcePolicy[];
}

@ObjectType()
export class HermesIntakeState {
  @Field(() => String) status:
    | 'NOT_CONFIGURED'
    | 'CONFIGURED_UNVERIFIED'
    | 'CONFIGURATION_ERROR';
  @Field(() => String) checkedAt: string;
  @Field(() => String, { nullable: true }) errorCode: string | null;
  @Field(() => [HermesIntakeEndpointState])
  endpoints: HermesIntakeEndpointState[];
}
