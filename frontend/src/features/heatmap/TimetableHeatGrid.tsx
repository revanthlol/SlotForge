import type { HeatmapCell, PressureSeverity } from './types';

const severityBackground: Record<PressureSeverity, string> = {
  critical: 'bg-error text-on-error',
  high: 'bg-secondary text-on-secondary',
  medium: 'bg-[#f6c84c] text-[#3d2b00]',
  low: 'bg-primary text-on-primary',
  none: 'bg-surface-container-low text-mono-grey',
};

function inferSeverity(value: number): PressureSeverity {
  if (value >= 90) return 'critical';
  if (value >= 70) return 'high';
  if (value >= 45) return 'medium';
  if (value > 0) return 'low';
  return 'none';
}

export default function TimetableHeatGrid({ cells }: { cells: HeatmapCell[] }) {
  const days = Array.from(new Set(cells.map((cell) => cell.day)));
  const periods = Array.from(new Set(cells.map((cell) => cell.period))).sort((a, b) => a - b);
  const lookup = new Map(cells.map((cell) => [`${cell.day}:${cell.period}`, cell]));

  if (!cells.length) {
    return (
      <div className="rounded-lg border border-dashed border-rule bg-surface-container-low p-8 text-center text-sm text-mono-grey">
        No utilization cells reported for this run.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-rule">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-inverse-surface text-inverse-on-surface">
            <th className="min-w-32 border-r border-white/10 px-3 py-3 text-left text-data-table">Day</th>
            {periods.map((period) => (
              <th key={period} className="min-w-28 border-r border-white/10 px-3 py-3 text-center text-data-table">Period {period}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <th className="border-r border-t border-rule bg-surface-container-low px-3 py-3 text-left font-semibold text-on-surface">{day}</th>
              {periods.map((period) => {
                const cell = lookup.get(`${day}:${period}`);
                const value = cell?.value || 0;
                const severity = cell?.severity || inferSeverity(value);
                return (
                  <td key={`${day}-${period}`} className="border-r border-t border-rule p-1.5">
                    <div
                      className={`flex h-14 min-w-24 flex-col items-center justify-center rounded-md border border-black/5 font-mono text-[11px] font-bold ${severityBackground[severity]}`}
                      title={cell?.label || `${day} period ${period}: ${value}% utilization`}
                    >
                      <span>{value}%</span>
                      {cell?.label && <span className="mt-0.5 max-w-full truncate px-1 text-[9px] opacity-80">{cell.label}</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
