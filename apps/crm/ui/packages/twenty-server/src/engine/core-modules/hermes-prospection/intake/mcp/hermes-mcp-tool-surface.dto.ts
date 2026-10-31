import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HermesMcpDiscoveredToolState {
  @Field(() => String) name: string;
  @Field(() => String, { nullable: true }) title: string | null;
  @Field(() => Boolean) authorized: boolean;
  @Field(() => Boolean) callable: boolean;
  @Field(() => [String]) refusals: string[];
  @Field(() => Boolean) isDraftingTool: boolean;
}

@ObjectType()
export class HermesMcpToolSurface {
  // READY means the company's configured server answered and this list is
  // what it advertises. It is never a proof that the drafting tool works: no
  // tool is called during discovery.
  @Field(() => String) status:
    | 'NOT_CONFIGURED'
    | 'READY'
    | 'UNAVAILABLE'
    | 'CONFIGURATION_ERROR';
  @Field(() => String) checkedAt: string;
  @Field(() => String, { nullable: true }) errorCode: string | null;
  // Names the operator granted, including any the server never advertised, so
  // a grant pointing at an absent tool stays visible instead of silent.
  @Field(() => [String]) authorizedTools: string[];
  @Field(() => String, { nullable: true }) draftingTool: string | null;
  @Field(() => Boolean) truncated: boolean;
  @Field(() => [HermesMcpDiscoveredToolState])
  tools: HermesMcpDiscoveredToolState[];
}
