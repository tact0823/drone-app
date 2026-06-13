import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  AI_PROMPT_PLACEHOLDERS,
  AI_PROMPT_TARGET_LABELS,
  activateAiPrompt,
  createAiPrompt,
  listAiPrompts,
  updateAiPrompt,
  type AiPrompt,
  type AiPromptTargetType,
} from '../../lib/aiPromptApi';

const TARGET_TYPES: AiPromptTargetType[] = ['SOLAR', 'ROOF', 'WALL', 'GENERAL'];

const EMPTY_FORM = {
  name: '',
  systemPrompt: '',
  userPrompt: '',
  model: '',
  isActive: false,
};

export function AdminAiSettingsPage() {
  const { csrfToken } = useAuth();
  const [category, setCategory] = useState<AiPromptTargetType>('SOLAR');
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPrompt = useMemo(
    () => prompts.find((item) => item.id === selectedId) ?? null,
    [prompts, selectedId],
  );

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAiPrompts(csrfToken ?? undefined, category);
      setPrompts(data.prompts);
      const active = data.prompts.find((item) => item.isActive) ?? data.prompts[0] ?? null;
      setSelectedId(active?.id ?? null);
      if (active) {
        setForm({
          name: active.name,
          systemPrompt: active.systemPrompt,
          userPrompt: active.userPrompt,
          model: active.model ?? '',
          isActive: active.isActive,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    } catch {
      setError('AIプロンプトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [category, csrfToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load admin data on category change
    void loadPrompts();
  }, [loadPrompts]);

  function selectPrompt(prompt: AiPrompt) {
    setSelectedId(prompt.id);
    setForm({
      name: prompt.name,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      model: prompt.model ?? '',
      isActive: prompt.isActive,
    });
    setMessage(null);
    setError(null);
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { prompt } = await updateAiPrompt(
        selectedId,
        {
          name: form.name,
          systemPrompt: form.systemPrompt,
          userPrompt: form.userPrompt,
          model: form.model.trim() || null,
          isActive: form.isActive,
        },
        csrfToken ?? undefined,
      );
      setMessage('保存しました');
      await loadPrompts();
      setSelectedId(prompt.id);
    } catch {
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (!selectedId) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await activateAiPrompt(selectedId, csrfToken ?? undefined);
      setMessage('有効化しました');
      await loadPrompts();
    } catch {
      setError('有効化に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateVersion() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const base = selectedPrompt ?? prompts[0];
      const suffix = prompts.length + 1;
      const { prompt } = await createAiPrompt(
        {
          name: base ? `${base.name.replace(/ v\d+$/, '')} v${suffix}` : `${AI_PROMPT_TARGET_LABELS[category]} v${suffix}`,
          targetType: category,
          systemPrompt: base?.systemPrompt ?? '',
          userPrompt: base?.userPrompt ?? '',
          model: base?.model ?? null,
          isActive: false,
        },
        csrfToken ?? undefined,
      );
      setMessage('新しいバージョンを作成しました');
      await loadPrompts();
      selectPrompt(prompt);
    } catch {
      setError('バージョン作成に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">AI設定</h1>
      <p className="mt-1 text-sm text-slate-500">
        診断カテゴリごとの GPT プロンプトを管理します（有効は各カテゴリ1件）
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TARGET_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setCategory(type)}
            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium ${
              category === type
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {AI_PROMPT_TARGET_LABELS[type]}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">読み込み中...</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">バージョン</p>
              <button
                type="button"
                onClick={handleCreateVersion}
                disabled={saving}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                + 新規
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {prompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => selectPrompt(prompt)}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${
                    selectedId === prompt.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-medium">{prompt.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {prompt.isActive ? '有効' : '無効'} ·{' '}
                    {new Date(prompt.updatedAt).toLocaleString('ja-JP')}
                  </span>
                </button>
              ))}
              {prompts.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-500">プロンプトがありません</p>
              )}
            </div>
          </div>

          {selectedPrompt ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">テンプレート名</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">LLM モデル（空欄=環境変数）</label>
                <input
                  value={form.model}
                  onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder="gpt-5.5"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">システムプロンプト</label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">ユーザープロンプト</label>
                <textarea
                  value={form.userPrompt}
                  onChange={(e) => setForm((prev) => ({ ...prev, userPrompt: e.target.value }))}
                  rows={16}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                有効（保存時に同一カテゴリの他バージョンは無効化されます）
              </label>

              <p className="text-xs text-slate-500">
                更新日時: {new Date(selectedPrompt.updatedAt).toLocaleString('ja-JP')}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
                {!selectedPrompt.isActive && (
                  <button
                    type="button"
                    onClick={handleActivate}
                    disabled={saving}
                    className="min-h-11 rounded-lg border border-slate-300 px-5 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    有効化
                  </button>
                )}
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-600">利用可能プレースホルダー</p>
                <p className="mt-2 font-mono text-xs text-slate-500">
                  {AI_PROMPT_PLACEHOLDERS.join(' ')}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              バージョンを選択するか、新規作成してください
            </div>
          )}
        </div>
      )}
    </div>
  );
}
