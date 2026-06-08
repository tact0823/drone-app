import type { OverallScore } from '../lib/inspectionData';
import { SCORE_LABELS } from '../lib/inspectionData';

const COLORS: Record<OverallScore, string> = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-lime-100 text-lime-800 border-lime-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  D: 'bg-orange-100 text-orange-800 border-orange-300',
  E: 'bg-red-100 text-red-800 border-red-300',
};

interface OverallScoreBadgeProps {
  score: OverallScore;
  size?: 'sm' | 'lg';
}

export function OverallScoreBadge({ score, size = 'sm' }: OverallScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border font-bold ${COLORS[score]} ${
        size === 'lg' ? 'px-4 py-2 text-2xl' : 'px-2 py-0.5 text-sm'
      }`}
    >
      {score}
      <span className={`ml-2 font-normal ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        {SCORE_LABELS[score]}
      </span>
    </span>
  );
}
