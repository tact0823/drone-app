import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProjectCard } from '../components/ProjectCard';
import { listProjects } from '../lib/projectApi';
import type { ProjectListItem } from '../lib/projects';

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then((data) => setProjects(data.projects))
      .catch(() => setError('プロジェクト一覧の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">マイプロジェクト</h1>
        <Link
          to="/projects/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 新規作成
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-500">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">プロジェクトを作成しましょう</p>
          <Link
            to="/projects/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            最初のプロジェクトを作成
          </Link>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
