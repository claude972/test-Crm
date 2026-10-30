import { Field, InputType, ObjectType } from '@nestjs/graphql';

import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType('CreateWorkspaceOnSameOriginInput')
export class CreateWorkspaceOnSameOriginInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  expectedWorkspaceId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;
}

@InputType('SelectWorkspaceOnSameOriginInput')
export class SelectWorkspaceOnSameOriginInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  expectedWorkspaceId: string;

  @Field(() => UUIDScalarType)
  @IsUUID()
  workspaceId: string;
}

@ObjectType('SameOriginWorkspaceCapabilities')
export class SameOriginWorkspaceCapabilities {
  @Field()
  enabled: boolean;

  @Field()
  canCreateWorkspace: boolean;
}
