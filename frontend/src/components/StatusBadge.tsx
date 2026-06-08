import type { ProjectStatus } from '../lib/projects';
import { STATUS_LABELS } from '../lib/projects';

interface StatusBadgeProps {
  status: ProjectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles =
    status === 'completed'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
