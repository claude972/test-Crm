import { registerEnumType } from '@nestjs/graphql';

import { type AiModelTier as SharedAiModelTier } from 'kovaa-lab-shared/ai';

// GraphQL needs a runtime enum; keys equal values so GraphQL names match the kovaa-lab-shared tier literals
export enum AiModelTier {
  extraFast = 'extraFast',
  fast = 'fast',
  balanced = 'balanced',
  smart = 'smart',
  extraSmart = 'extraSmart',
}

registerEnumType(AiModelTier, { name: 'AiModelTier' });

// fails to compile when a tier is added on only one side
const _assertTierValuesMatchShared: Record<SharedAiModelTier, AiModelTier> =
  AiModelTier;
