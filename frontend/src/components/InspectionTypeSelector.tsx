import type { InspectionType } from '../lib/projects';
import { INSPECTION_TYPE_META } from '../lib/projects';

interface InspectionTypeSelectorProps {
  value: InspectionType | null;
  onChange: (value: InspectionType) => void;
  error?: string;
}

const TYPES: InspectionType[] = ['SOLAR_PANEL', 'EXTERIOR_WALL', 'ROOF'];

export function InspectionTypeSelector({ value, onChange, error }: InspectionTypeSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">
        点検種別 <span className="text-red-500">*</span>
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TYPES.map((type) => {
          const meta = INSPECTION_TYPE_META[type];
          const selected = value === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={`min-h-11 rounded-xl border p-4 text-left transition ${
                selected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{meta.icon}</span>
              <p className="mt-2 text-sm font-medium text-slate-900">{meta.label}</p>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
