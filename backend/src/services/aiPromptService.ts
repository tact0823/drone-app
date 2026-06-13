import type { AiPrompt, AiPromptInput, AiPromptTargetType, AiPromptUpdateInput } from '../types/aiPrompt.js';
import { DEFAULT_AI_PROMPT_SEEDS } from '../constants/defaultAiPrompts.js';
import { getPool } from '../db/pool.js';
import type { InspectionType } from '../types/project.js';

interface AiPromptRow {
  id: string;
  name: string;
  target_type: AiPromptTargetType;
  system_prompt: string;
  user_prompt: string;
  model: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: AiPromptRow): AiPrompt {
  return {
    id: row.id,
    name: row.name,
    targetType: row.target_type,
    systemPrompt: row.system_prompt,
    userPrompt: row.user_prompt,
    model: row.model,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function inspectionTypeToPromptTarget(inspectionType: InspectionType): AiPromptTargetType {
  switch (inspectionType) {
    case 'SOLAR_PANEL':
      return 'SOLAR';
    case 'ROOF':
      return 'ROOF';
    case 'EXTERIOR_WALL':
      return 'WALL';
    default:
      return 'GENERAL';
  }
}

export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? '');
}

export async function ensureDefaultAiPrompts(): Promise<void> {
  const count = await getPool().query<{ count: string }>('SELECT COUNT(*) AS count FROM ai_prompts');
  if (Number(count.rows[0]?.count ?? 0) > 0) {
    return;
  }

  for (const seed of DEFAULT_AI_PROMPT_SEEDS) {
    await createAiPrompt(seed);
  }
  console.log('Seeded default AI prompts');
}

export async function listAiPrompts(targetType?: AiPromptTargetType): Promise<AiPrompt[]> {
  const result = targetType
    ? await getPool().query<AiPromptRow>(
        'SELECT * FROM ai_prompts WHERE target_type = $1 ORDER BY is_active DESC, updated_at DESC',
        [targetType],
      )
    : await getPool().query<AiPromptRow>(
        'SELECT * FROM ai_prompts ORDER BY target_type, is_active DESC, updated_at DESC',
      );
  return result.rows.map(mapRow);
}

export async function getAiPromptById(id: string): Promise<AiPrompt | null> {
  const result = await getPool().query<AiPromptRow>('SELECT * FROM ai_prompts WHERE id = $1', [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function getActiveAiPrompt(targetType: AiPromptTargetType): Promise<AiPrompt | null> {
  const result = await getPool().query<AiPromptRow>(
    'SELECT * FROM ai_prompts WHERE target_type = $1 AND is_active = true LIMIT 1',
    [targetType],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function getActiveAiPromptForInspection(
  inspectionType: InspectionType,
): Promise<AiPrompt | null> {
  const primary = inspectionTypeToPromptTarget(inspectionType);
  const prompt = await getActiveAiPrompt(primary);
  if (prompt) return prompt;
  if (primary !== 'GENERAL') {
    return getActiveAiPrompt('GENERAL');
  }
  return null;
}

export async function createAiPrompt(input: AiPromptInput): Promise<AiPrompt> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (input.isActive) {
      await client.query(
        'UPDATE ai_prompts SET is_active = false, updated_at = NOW() WHERE target_type = $1',
        [input.targetType],
      );
    }

    const result = await client.query<AiPromptRow>(
      `INSERT INTO ai_prompts (name, target_type, system_prompt, user_prompt, model, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.name,
        input.targetType,
        input.systemPrompt,
        input.userPrompt,
        input.model ?? null,
        input.isActive ?? false,
      ],
    );
    await client.query('COMMIT');
    return mapRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAiPrompt(id: string, input: AiPromptUpdateInput): Promise<AiPrompt | null> {
  const existing = await getAiPromptById(id);
  if (!existing) return null;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (input.isActive === true) {
      await client.query(
        'UPDATE ai_prompts SET is_active = false, updated_at = NOW() WHERE target_type = $1',
        [existing.targetType],
      );
    }

    const result = await client.query<AiPromptRow>(
      `UPDATE ai_prompts
       SET name = $2,
           system_prompt = $3,
           user_prompt = $4,
           model = $5,
           is_active = $6,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.name ?? existing.name,
        input.systemPrompt ?? existing.systemPrompt,
        input.userPrompt ?? existing.userPrompt,
        input.model !== undefined ? input.model : existing.model,
        input.isActive ?? existing.isActive,
      ],
    );
    await client.query('COMMIT');
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function activateAiPrompt(id: string): Promise<AiPrompt | null> {
  const existing = await getAiPromptById(id);
  if (!existing) return null;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE ai_prompts SET is_active = false, updated_at = NOW() WHERE target_type = $1',
      [existing.targetType],
    );
    const result = await client.query<AiPromptRow>(
      `UPDATE ai_prompts SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    await client.query('COMMIT');
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function toAuditPromptSnapshot(prompt: AiPrompt) {
  return {
    name: prompt.name,
    targetType: prompt.targetType,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    model: prompt.model,
    isActive: prompt.isActive,
  };
}
