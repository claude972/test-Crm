import { Field, ObjectType } from '@nestjs/graphql';

import { AuthToken } from 'src/engine/core-modules/auth/dto/auth-token.dto';
import { AuthTokenPair } from 'src/engine/core-modules/auth/dto/auth-token-pair.dto';

@ObjectType()
export class AuthTokens {
  @Field(() => AuthTokenPair)
  tokens: AuthTokenPair;

  @Field(() => AuthToken, { nullable: true })
  workspaceLoginToken?: AuthToken;
}
