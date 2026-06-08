/**
 * OpenAI / LLM 接続確認 — GPT-5.5 + AI 診断
 * Usage: npm run verify:llm
 */
import { fileURLToPath } from 'node:url';
import { env } from '../src/config/env.js';
import { analyzeAnomaly } from '../src/services/aiService.js';

function completionLimitParams(model: string, maxTokens: number): Record<string, number> {
  if (/^gpt-5|^o[134]/.test(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

interface StepResult {
  step: string;
  ok: boolean;
  detail: string;
}

const results: StepResult[] = [];

function record(step: string, ok: boolean, detail: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}: ${detail}`);
}

async function testRawOpenAiConnection(): Promise<{ ok: boolean; detail: string }> {
  if (!env.llmApiKey) {
    return { ok: false, detail: 'LLM_API_KEY が未設定' };
  }

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
        model: env.llmModel,
        messages: [{ role: 'user', content: 'Reply with JSON only: {"status":"ok"}' }],
        ...completionLimitParams(env.llmModel, 50),
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    if (!response.ok) {
      return { ok: false, detail: `HTTP ${response.status} — ${bodyText.slice(0, 200)}` };
    }

    const data = JSON.parse(bodyText) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return {
      ok: Boolean(content),
      detail: `model=${data.model ?? env.llmModel}, response=${content.slice(0, 80)}`,
    };
  } catch (error) {
    return { ok: false, detail: String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  console.log('\n=== LLM Connectivity Test ===\n');

  record(
    '0. 環境変数',
    Boolean(env.llmApiKey) && Boolean(env.llmModel),
    `LLM_MODEL=${env.llmModel}, API_KEY=${env.llmApiKey ? 'set' : 'missing'}, URL=${env.llmApiUrl}`,
  );

  if (!env.llmApiKey) {
    printSummary();
    process.exit(1);
  }

  const raw = await testRawOpenAiConnection();
  record('1. OpenAI API 接続', raw.ok, raw.detail);

  if (!raw.ok) {
    printSummary();
    process.exit(1);
  }

  const analysis = await analyzeAnomaly({
    inspectionType: 'SOLAR_PANEL',
    partName: 'パネル列3 No.12',
    direction: 'S',
    marker: { x: 0.25, y: 0.4, w: 0.08, h: 0.06 },
    memo: '周辺セルより明確な温度上昇域',
  });

  const analysisOk =
    analysis.source === 'llm' &&
    analysis.comment.length >= 80 &&
    ['low', 'medium', 'high'].includes(analysis.severity);

  record(
    '2. AI 診断 (analyzeAnomaly)',
    analysisOk,
    analysisOk
      ? `source=${analysis.source}, type=${analysis.anomalyType}, severity=${analysis.severity}, commentLen=${analysis.comment.length}`
      : `source=${analysis.source} (expected llm), commentLen=${analysis.comment.length}`,
  );

  if (analysisOk) {
    record(
      '3. 診断コメント抜粋',
      true,
      `${analysis.comment.slice(0, 120)}...`,
    );
  }

  printSummary();
  if (results.some((item) => !item.ok)) {
    process.exit(1);
  }
}

function printSummary() {
  const passed = results.filter((item) => item.ok).length;
  console.log(`\n=== Summary: ${passed}/${results.length} passed ===\n`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
