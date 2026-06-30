import { useMemo, useState } from 'react';
import type { Organization, Room, ScheduledSlot, Section, Teacher } from '../../hooks/useApi';

type HeatmapMode = 'rooms' | 'teachers' | 'sections';

interface SolverBottleneckHeatmapProps {
  assignments: ScheduledSlot[];
  teachers: Teacher[];
  rooms: Room[];
  sections: Section[];
  organization: Organization | null;
  infeasibleReason?: string | null;
}

interface HeatmapResource {
  id: string;
  name: string;
}

const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const bottleneckLabels: Record<string, string> = {
  room: 'Room capacity bottleneck',
  teacher: 'Teacher availability bottleneck',
  section: 'Weekly-hour load bottleneck',
  structural: 'Structural scheduling bottleneck',
};

function getDayValues(organization: Organization | null) {
  const cycleLength = organization?.cycle_length || 5;
  const isDayOrder = organization?.scheduling_mode === 'day_order';

  return Array.from({ length: cycleLength }).map((_, index) => {
    if (isDayOrder) return `Day Order ${roman[index + 1] || index + 1}`;
    return weekdays[index] || `Day ${index + 1}`;
  });
}

function getDayLabel(day: string) {
  if (day.startsWith('Day Order ')) return day.replace('Day Order ', 'Day ');
  return day;
}

function inferBottleneck(reason?: string | null): keyof typeof bottleneckLabels | null {
  if (!reason) return null;
  const normalized = reason.toLowerCase();
  if (normalized.includes('room')) return 'room';
  if (normalized.includes('teacher')) return 'teacher';
  if (normalized.includes('weekly') || normalized.includes('hour')) return 'section';
  if (normalized.includes('structural') || normalized.includes('double-booking') || normalized.includes('slot')) {
    return 'structural';
  }
  return 'structural';
}

function modeMatchesBottleneck(mode: HeatmapMode, bottleneck: keyof typeof bottleneckLabels | null) {
  if (!bottleneck) return false;
  if (mode === 'rooms') return bottleneck === 'room' || bottleneck === 'structural';
  if (mode === 'teachers') return bottleneck === 'teacher' || bottleneck === 'structural';
  return bottleneck === 'section' || bottleneck === 'structural';
}

function cellClass(count: number, highlighted: boolean) {
  if (count > 1) return 'border-error bg-error-container text-error';
  if (count === 1 && highlighted) return 'border-secondary bg-signal-soft text-secondary';
  if (count === 1) return 'border-primary/30 bg-accent-soft text-primary';
  if (highlighted) return 'border-secondary/20 bg-signal-soft/30 text-secondary';
  return 'border-rule bg-surface-container-low text-mono-grey';
}

export default function SolverBottleneckHeatmap({
  assignments,
  teachers,
  rooms,
  sections,
  organization,
  infeasibleReason,
}: SolverBottleneckHeatmapProps) {
  const [mode, setMode] = useState<HeatmapMode>('rooms');
  const days = useMemo(() => getDayValues(organization), [organization]);
  const periodsPerDay = organization?.periods_per_day || 5;
  const bottleneck = inferBottleneck(infeasibleReason);
  const highlightMode = modeMatchesBottleneck(mode, bottleneck);

  const resources = useMemo<HeatmapResource[]>(() => {
    if (mode === 'teachers') return teachers.map((teacher) => ({ id: teacher.id, name: teacher.name }));
    if (mode === 'sections') return sections.map((section) => ({ id: section.id, name: section.name }));
    return rooms.map((room) => ({ id: room.id, name: room.name }));
  }, [mode, rooms, sections, teachers]);

  const occupancy = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((slot) => {
      const resourceId = mode === 'teachers' ? slot.teacher_id : mode === 'sections' ? slot.section_id : slot.room_id;
      const duration = Math.max(1, Math.min(slot.duration_periods || 1, periodsPerDay - slot.period + 1));
      for (let offset = 0; offset < duration; offset += 1) {
        const period = slot.period + offset;
        const key = `${resourceId}:${slot.day}:${period}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [assignments, mode, periodsPerDay]);

  const occupiedCells = Array.from(occupancy.values()).filter((count) => count > 0).length;
  const conflictCells = Array.from(occupancy.values()).filter((count) => count > 1).length;
  const totalCells = resources.length * days.length * periodsPerDay;
  const loadPercent = totalCells > 0 ? Math.round((occupiedCells / totalCells) * 100) : 0;

  const modeButtons: Array<{ id: HeatmapMode; label: string; icon: string }> = [
    { id: 'rooms', label: 'Rooms', icon: 'meeting_room' },
    { id: 'teachers', label: 'Teachers', icon: 'school' },
    { id: 'sections', label: 'Sections', icon: 'groups' },
  ];

  return (
    <section className="bg-paper-raised border-2 border-rule rounded-xl p-inset-standard space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>
              grid_view
            </span>
            <h3 className="text-headline-sm text-on-surface">Solver Bottleneck Heatmap</h3>
          </div>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Resource pressure by day and period, derived from the latest timetable data.
          </p>
        </div>

        <div className="flex rounded-lg border border-rule bg-surface-container p-0.5">
          {modeButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => setMode(button.id)}
              className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                mode === button.id ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-paper-raised'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {button.icon}
              </span>
              {button.label}
            </button>
          ))}
        </div>
      </div>

      {bottleneck && (
        <div className="flex gap-3 rounded-lg border border-secondary/20 bg-signal-soft p-3 text-xs text-secondary">
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18 }}>
            warning
          </span>
          <div>
            <p className="font-semibold">{bottleneckLabels[bottleneck]}</p>
            <p className="mt-0.5 text-on-surface-variant">
              The heatmap highlights the affected resource category without inventing exact conflict cells.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg border border-rule bg-surface-container-low p-3">
          <p className="text-data-table text-mono-grey">Load</p>
          <p className="mt-1 text-lg font-black text-on-surface">{loadPercent}%</p>
        </div>
        <div className="rounded-lg border border-rule bg-surface-container-low p-3">
          <p className="text-data-table text-mono-grey">Occupied Cells</p>
          <p className="mt-1 text-lg font-black text-on-surface">{occupiedCells}</p>
        </div>
        <div className="rounded-lg border border-rule bg-surface-container-low p-3">
          <p className="text-data-table text-mono-grey">Conflict Cells</p>
          <p className={`mt-1 text-lg font-black ${conflictCells > 0 ? 'text-error' : 'text-primary'}`}>
            {conflictCells}
          </p>
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-rule bg-surface-container-low p-8 text-center text-sm text-mono-grey">
          No resources available for this heatmap mode.
        </div>
      ) : assignments.length === 0 && !infeasibleReason ? (
        <div className="rounded-lg border border-dashed border-rule bg-surface-container-low p-8 text-center text-sm text-mono-grey">
          No solver run data available yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-rule">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container">
                <th className="sticky left-0 z-10 min-w-[150px] border-b border-r border-rule bg-surface-container px-3 py-2 text-left text-data-table text-mono-grey">
                  Resource
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    colSpan={periodsPerDay}
                    className="border-b border-r border-rule px-3 py-2 text-center text-data-table text-mono-grey"
                  >
                    {getDayLabel(day)}
                  </th>
                ))}
              </tr>
              <tr className="bg-surface-container-low">
                <th className="sticky left-0 z-10 border-b border-r border-rule bg-surface-container-low px-3 py-1" />
                {days.flatMap((day) => (
                  Array.from({ length: periodsPerDay }).map((_, index) => (
                    <th
                      key={`${day}-${index + 1}`}
                      className="min-w-10 border-b border-r border-rule px-2 py-1 text-center font-mono text-[10px] text-mono-grey"
                    >
                      P{index + 1}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id} className="hover:bg-surface-container-low/60">
                  <th className="sticky left-0 z-10 max-w-[190px] truncate border-r border-rule bg-paper-raised px-3 py-2 text-left font-semibold text-on-surface">
                    {resource.name}
                  </th>
                  {days.flatMap((day) => (
                    Array.from({ length: periodsPerDay }).map((_, index) => {
                      const period = index + 1;
                      const count = occupancy.get(`${resource.id}:${day}:${period}`) || 0;
                      const highlighted = highlightMode && count === 0 && assignments.length === 0;
                      return (
                        <td key={`${resource.id}-${day}-${period}`} className="border-r border-rule p-1">
                          <div
                            className={`flex h-8 min-w-8 items-center justify-center rounded border font-mono text-[10px] font-bold ${cellClass(count, highlighted || highlightMode)}`}
                            title={`${resource.name}, ${getDayLabel(day)} period ${period}: ${count} assignment${count === 1 ? '' : 's'}`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </td>
                      );
                    })
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-mono-grey">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-rule bg-surface-container-low" />
          Empty
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-primary/30 bg-accent-soft" />
          Occupied
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-secondary bg-signal-soft" />
          Diagnostic focus
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-error bg-error-container" />
          Conflict pressure
        </span>
      </div>
    </section>
  );
}
