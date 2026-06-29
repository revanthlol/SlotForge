interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, string> = {
  published: 'bg-accent-soft text-primary border border-primary/20',
  active: 'bg-accent-soft text-primary border border-primary/20',
  ready: 'bg-accent-soft text-primary border border-primary/20',
  draft: 'bg-signal-soft text-secondary border border-secondary/20',
  pending: 'bg-signal-soft text-secondary border border-secondary/20',
  archived: 'bg-surface-container-high text-mono-grey border border-rule',
  error: 'bg-error-container text-on-error-container border border-error/20',
  overload: 'bg-error-container text-on-error-container border border-error/20',
  infeasible: 'bg-error-container text-on-error-container border border-error/20',
  optimal: 'bg-accent-soft text-primary border border-primary/20',
  feasible: 'bg-signal-soft text-secondary border border-secondary/20',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const style = statusStyles[key] || 'bg-surface-container text-on-surface-variant border border-rule';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium tracking-wider uppercase ${style} ${sizeClass}`}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {status}
    </span>
  );
}
