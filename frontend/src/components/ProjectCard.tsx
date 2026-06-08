import { Link } from 'react-router-dom';
import type { ProjectListItem } from '../lib/projects';
import { INSPECTION_TYPE_META } from '../lib/projects';
import { StatusBadge } from './StatusBadge';

interface ProjectCardProps {
  project: ProjectListItem;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const meta = INSPECTION_TYPE_META[project.inspectionType];

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{project.title}</h2>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {meta.icon} {meta.label}
      </p>
      <p className="mt-1 text-sm text-slate-500">{project.siteName}</p>
      <p className="mt-3 text-xs text-slate-400">
        点検日: {project.inspectionDate}
      </p>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span>画像: {project.imageCount}枚</span>
        <span>異常: {project.anomalyCount}件</span>
      </div>
    </Link>
  );
}
