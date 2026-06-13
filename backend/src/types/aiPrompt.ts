export type AiPromptTargetType = 'SOLAR' | 'ROOF' | 'WALL' | 'GENERAL';

export const AI_PROMPT_TARGET_TYPES: AiPromptTargetType[] = ['SOLAR', 'ROOF', 'WALL', 'GENERAL'];

export interface AiPrompt {
  id: string;
  name: string;
  targetType: AiPromptTargetType;
  systemPrompt: string;
  userPrompt: string;
  model: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiPromptInput {
  name: string;
  targetType: AiPromptTargetType;
  systemPrompt: string;
  userPrompt: string;
  model?: string | null;
  isActive?: boolean;
}

export interface AiPromptUpdateInput {
  name?: string;
  systemPrompt?: string;
  userPrompt?: string;
  model?: string | null;
  isActive?: boolean;
}
