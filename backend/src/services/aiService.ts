import { env } from '../config/env.js';
import { SEVERITY_GUIDELINES } from '../constants/defaultAiPrompts.js';
import { INSPECTION_TYPES } from '../constants/inspectionTypes.js';
import {
  getActiveAiPromptForInspection,
  renderPromptTemplate,
} from '../services/aiPromptService.js';
import type { InspectionType } from '../types/project.js';
import type { AnomalyType, SeverityLevel } from '../types/anomaly.js';

export interface AnomalyAnalysisInput {
  inspectionType: InspectionType;
  partName?: string | null;
  direction?: string | null;
  checkContent?: string | null;
  memo?: string | null;
  marker?: { x: number; y: number; w: number; h: number } | null;
  regenerate?: boolean;
}

export interface AnomalyAnalysisResult {
  anomalyType: AnomalyType;
  severity: SeverityLevel;
  comment: string;
  checkContent: string | null;
  source: 'llm' | 'template';
}

const VALID_SEVERITIES: SeverityLevel[] = ['low', 'medium', 'high'];

function getAnomalyLabel(inspectionType: InspectionType, anomalyType: AnomalyType): string {
  const master = INSPECTION_TYPES.find((item) => item.code === inspectionType);
  return master?.anomalyTypes.find((item) => item.code === anomalyType)?.label ?? anomalyType;
}

function allowedAnomalyTypes(inspectionType: InspectionType): AnomalyType[] {
  const master = INSPECTION_TYPES.find((item) => item.code === inspectionType);
  return (master?.anomalyTypes.map((item) => item.code) ?? ['OTHER']) as AnomalyType[];
}

function normalizeAnomalyType(
  inspectionType: InspectionType,
  value: unknown,
): AnomalyType {
  const allowed = allowedAnomalyTypes(inspectionType);
  if (typeof value === 'string' && allowed.includes(value as AnomalyType)) {
    return value as AnomalyType;
  }
  return allowed[0] ?? 'OTHER';
}

function normalizeSeverity(value: unknown): SeverityLevel {
  if (typeof value === 'string' && VALID_SEVERITIES.includes(value as SeverityLevel)) {
    return value as SeverityLevel;
  }
  return 'medium';
}

function severityLabel(severity: SeverityLevel): string {
  return severity === 'high' ? '高' : severity === 'medium' ? '中' : '低';
}

function describeMarker(marker?: AnomalyAnalysisInput['marker']): string {
  if (!marker) return '未指定';
  const areaPct = Math.round(marker.w * marker.h * 1000) / 10;
  const cx = Math.round((marker.x + marker.w / 2) * 100);
  const cy = Math.round((marker.y + marker.h / 2) * 100);
  return `矩形領域 面積比 約${areaPct}%（中心位置 X${cx}% Y${cy}%）`;
}

function buildPromptVariables(input: AnomalyAnalysisInput): Record<string, string> {
  const inspectionLabel =
    INSPECTION_TYPES.find((item) => item.code === input.inspectionType)?.label ??
    input.inspectionType;
  const typeOptions = allowedAnomalyTypes(input.inspectionType)
    .map((code) => `${code}=${getAnomalyLabel(input.inspectionType, code)}`)
    .join(', ');

  return {
    inspectionLabel,
    partName: input.partName?.trim() || '未指定',
    direction: input.direction?.trim() || '未指定',
    markerDescription: describeMarker(input.marker),
    memo: input.memo?.trim() || input.checkContent?.trim() || 'なし',
    typeOptions,
    severityGuidelines: SEVERITY_GUIDELINES,
  };
}

function buildTemplateAnalysis(input: AnomalyAnalysisInput): AnomalyAnalysisResult {
  const allowed = allowedAnomalyTypes(input.inspectionType);
  const text = `${input.partName ?? ''} ${input.memo ?? ''} ${input.checkContent ?? ''}`.toLowerCase();

  let anomalyType: AnomalyType = allowed.includes('OTHER') ? 'OTHER' : allowed[0];
  if (input.inspectionType === 'SOLAR_PANEL') {
    if (/層間|剥離|delam/i.test(text)) anomalyType = 'DELAMINATION';
    else if (/コールド|cold|低温/i.test(text)) anomalyType = 'COLD_SPOT';
    else if (/クラック|ひび/i.test(text)) anomalyType = 'CRACK';
    else if (/ホット|hot|発熱|過熱/i.test(text)) anomalyType = 'HOT_SPOT';
    else anomalyType = 'HOT_SPOT';
  } else if (/水分|雨漏|湿/i.test(text)) {
    anomalyType = allowed.includes('MOISTURE') ? 'MOISTURE' : anomalyType;
  } else if (/断熱/i.test(text)) {
    anomalyType = allowed.includes('INSULATION_DEFECT') ? 'INSULATION_DEFECT' : anomalyType;
  } else if (/劣化|老朽/i.test(text)) {
    anomalyType = allowed.includes('DETERIORATION') ? 'DETERIORATION' : anomalyType;
  } else if (/クラック|ひび/i.test(text)) {
    anomalyType = allowed.includes('CRACK') ? 'CRACK' : anomalyType;
  } else if (allowed.includes('HOT_SPOT')) {
    anomalyType = 'HOT_SPOT';
  }

  let severity: SeverityLevel = 'medium';
  if (/緊急|重大|即|火災|ショート/i.test(text)) severity = 'high';
  else if (/軽微|経過|観察/i.test(text)) severity = 'low';

  const typeLabel = getAnomalyLabel(input.inspectionType, anomalyType);
  const location = input.partName?.trim() ? `${input.partName.trim()}（${input.direction ?? '方位未指定'}）` : '当該部位';
  const markerNote = input.marker ? `サーマル画像上では${describeMarker(input.marker)}に温度異常域を確認。` : '';

  const comment =
    `【所見】${location}において${typeLabel}を認めました。${markerNote}` +
    `【推定原因】経年劣化・施工差異・局部の抵抗増加等により、周辺との温度分布に差異が生じている可能性があります。` +
    `【影響・リスク】重要度${severityLabel(severity)}。放置時は劣化拡大や性能低下（発電効率・防水性）に波及する恐れがあります。` +
    `【推奨対応】可視画像との照合、接触式温度計による実測、近接セル/周辺部の追加サーマル撮影を実施し、3〜6か月以内の再点検または計画修繕を推奨します。`;

  const checkContent =
    input.checkContent?.trim() ||
    `${typeLabel}部位の可視確認、温度差の定量測定、周辺部の拡大サーマル`;

  return { anomalyType, severity, comment, checkContent, source: 'template' };
}

function parseAnalysisJson(
  inspectionType: InspectionType,
  raw: string,
): AnomalyAnalysisResult | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const comment = typeof parsed.comment === 'string' ? parsed.comment.trim() : '';
    if (comment.length < 80) return null;

    return {
      anomalyType: normalizeAnomalyType(inspectionType, parsed.anomalyType),
      severity: normalizeSeverity(parsed.severity),
      comment,
      checkContent:
        typeof parsed.checkContent === 'string' && parsed.checkContent.trim()
          ? parsed.checkContent.trim()
          : null,
      source: 'llm',
    };
  } catch {
    return null;
  }
}

function usesMaxCompletionTokens(model: string): boolean {
  return /^gpt-5|^o[134]/.test(model);
}

function completionLimitParams(model: string, maxTokens: number): Record<string, number> {
  if (usesMaxCompletionTokens(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

function temperatureParam(model: string, value: number): Record<string, number> | Record<string, never> {
  if (usesMaxCompletionTokens(model)) {
    return {};
  }
  return { temperature: value };
}

export async function analyzeAnomaly(input: AnomalyAnalysisInput): Promise<AnomalyAnalysisResult> {
  const fallback = buildTemplateAnalysis(input);

  if (!env.llmApiKey || !env.databaseUrl) {
    return fallback;
  }

  let prompt;
  try {
    prompt = await getActiveAiPromptForInspection(input.inspectionType);
  } catch {
    return fallback;
  }

  if (!prompt) {
    return fallback;
  }

  const model = prompt.model?.trim() || env.llmModel;
  const userContent = renderPromptTemplate(prompt.userPrompt, buildPromptVariables(input));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(`${env.llmApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.llmApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: userContent },
        ],
        ...completionLimitParams(model, 900),
        ...temperatureParam(model, input.regenerate ? 0.65 : 0.35),
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return fallback;

    return parseAnalysisJson(input.inspectionType, content) ?? fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

/** @deprecated 互換用 — analyzeAnomaly を利用 */
export async function generateDiagnosticComment(params: {
  inspectionType: InspectionType;
  anomalyType: AnomalyType;
  severity: SeverityLevel;
  memo?: string | null;
  regenerate?: boolean;
}): Promise<string> {
  const result = await analyzeAnomaly({
    inspectionType: params.inspectionType,
    partName: params.memo,
    memo: params.memo,
    regenerate: params.regenerate,
  });
  return result.comment;
}
