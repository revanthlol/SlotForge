import type { WorkspaceResource } from '../../hooks/useApi';

interface FacultyCardProps {
  faculty: WorkspaceResource;
  selected: boolean;
  assignedPeriods: number;
  onSelect: () => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function FacultyCard({ faculty, selected, assignedPeriods, onSelect }: FacultyCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group w-full rounded-xl border-2 p-4 text-left transition-all',
        selected
          ? 'border-primary bg-accent-soft text-primary shadow-sm'
          : 'border-rule bg-paper-raised text-on-surface hover:border-primary/40 hover:bg-surface-container-low',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-black',
          selected ? 'border-primary/30 bg-paper-raised text-primary' : 'border-rule bg-accent-soft text-primary',
        ].join(' ')}>
          {initials(faculty.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{faculty.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-data-table text-mono-grey">{faculty.resource_type}</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span className="text-data-table text-mono-grey">{assignedPeriods} periods</span>
          </div>
        </div>
        <span className="material-symbols-outlined text-mono-grey transition-transform group-hover:translate-x-0.5" style={{ fontSize: 18 }}>
          chevron_right
        </span>
      </div>
    </button>
  );
}
