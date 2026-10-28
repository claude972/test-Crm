import { type AiModelTier } from 'kovaa-lab-shared/ai';

export type WorkspaceAiModelSettings = {
  isAutoModelSelectionEnabled: boolean;
  aiModelIdByTier: Partial<Record<AiModelTier, string>>;
  aiChatModelTier: AiModelTier;
  aiAgentModelTier: AiModelTier;
};
