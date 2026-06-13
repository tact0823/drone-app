import { fetchApi } from './api';

export type AiPromptTargetType = 'SOLAR' | 'ROOF' | 'WALL' | 'GENERAL';

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

export const AI_PROMPT_TARGET_LABELS: Record<AiPromptTargetType, string> = {
  SOLAR: '太陽光パネル',
  ROOF: '屋根',
  WALL: '外壁',
  GENERAL: '汎用',
};

export const AI_PROMPT_PLACEHOLDERS = [
  '{{inspectionLabel}}',
  '{{partName}}',
  '{{direction}}',
  '{{markerDescription}}',
  '{{memo}}',
  '{{typeOptions}}',
  '{{severityGuidelines}}',
];

function withCsrf(csrfToken?: string): HeadersInit | undefined {
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined;
}

export function listAiPrompts(
  csrfToken?: string,
  targetType?: AiPromptTargetType,
): Promise<{ prompts: AiPrompt[]; total: number }> {
  const query = targetType ? `?targetType=${targetType}` : '';
  return fetchApi(`/api/v1/admin/ai-prompts${query}`, { headers: withCsrf(csrfToken) });
}

export function getAiPrompt(
  id: string,
  csrfToken?: string,
): Promise<{ prompt: AiPrompt }> {
  return fetchApi(`/api/v1/admin/ai-prompts/${id}`, { headers: withCsrf(csrfToken) });
}

export function createAiPrompt(
  payload: {
    name: string;
    targetType: AiPromptTargetType;
    systemPrompt: string;
    userPrompt: string;
    model?: string | null;
    isActive?: boolean;
  },
  csrfToken?: string,
): Promise<{ prompt: AiPrompt }> {
  return fetchApi('/api/v1/admin/ai-prompts', {
    method: 'POST',
    headers: withCsrf(csrfToken),
    body: JSON.stringify(payload),
  });
}

export function updateAiPrompt(
  id: string,
  payload: {
    name?: string;
    systemPrompt?: string;
    userPrompt?: string;
    model?: string | null;
    isActive?: boolean;
  },
  csrfToken?: string,
): Promise<{ prompt: AiPrompt }> {
  return fetchApi(`/api/v1/admin/ai-prompts/${id}`, {
    method: 'PUT',
    headers: withCsrf(csrfToken),
    body: JSON.stringify(payload),
  });
}

export function activateAiPrompt(
  id: string,
  csrfToken?: string,
): Promise<{ prompt: AiPrompt }> {
  return fetchApi(`/api/v1/admin/ai-prompts/${id}/activate`, {
    method: 'POST',
    headers: withCsrf(csrfToken),
  });
}
