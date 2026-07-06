import type { FacultyAssignment, Organization } from '../../hooks/useApi';

interface FacultyTimetableViewProps {
  facultyName: string;
  assignments: FacultyAssignment[];
  organization?: Organization | null;
  compact?: boolean;
  versionLabel?: string | null;
  publishedAt?: string | null;
}

const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const weekdayLabels: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

function daySortValue(day: string) {
  const fixed = weekdays.indexOf(day);
  if (fixed >= 0) return fixed;
  const match = day.match(/Day Order\s+([IVX]+|\d+)/i);
  if (!match) return 99;
  const romanIndex = roman.findIndex((value) => value.toLowerCase() === match[1].toLowerCase());
  return romanIndex > 0 ? romanIndex - 1 : Number(match[1]) - 1;
}

function buildDays(assignments: FacultyAssignment[], organization?: Organization | null) {
  if (organization) {
    const cycleLength = organization.cycle_length || 5;
    if (organization.scheduling_mode === 'day_order') {
      return Array.from({ length: cycleLength }).map((_, index) => `Day Order ${roman[index + 1] || index + 1}`);
    }
    return Array.from({ length: cycleLength }).map((_, index) => weekdays[index] || `Day ${index + 1}`);
  }
  const found = Array.from(new Set(assignments.map((item) => item.day)));
  return found.length ? found.sort((a, b) => daySortValue(a) - daySortValue(b)) : weekdays.slice(0, 5);
}

function buildPeriods(assignments: FacultyAssignment[], organization?: Organization | null) {
  if (organization?.periods_per_day) return organization.periods_per_day;
  return Math.max(5, ...assignments.map((item) => item.period + (item.duration_periods || 1) - 1));
}

function dayLabel(day: string) {
  if (day.startsWith('Day Order ')) return day.replace('Day Order ', 'Day ');
  return weekdayLabels[day] || day;
}

function subjectCode(name?: string) {
  if (!name) return 'CLS';
  const code = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('');
  return (code || name).slice(0, 5).toUpperCase();
}

export default function FacultyTimetableView({
  facultyName,
  assignments,
  organization,
  compact = false,
  versionLabel,
  publishedAt,
}: FacultyTimetableViewProps) {
  const days = buildDays(assignments, organization);
  const periods = buildPeriods(assignments, organization);
  const totalPeriods = assignments.reduce((sum, item) => sum + (item.duration_periods || 1), 0);
  const freePeriods = Math.max(days.length * periods - totalPeriods, 0);
  const slotByStart = new Map(assignments.map((item) => [`${item.day}:${item.period}`, item]));
  const covered = new Set<string>();
  assignments.forEach((item) => {
    for (let offset = 1; offset < (item.duration_periods || 1); offset += 1) {
      covered.add(`${item.day}:${item.period + offset}`);
    }
  });

  return (
    <div className="overflow-hidden rounded-xl border-2 border-rule bg-paper-raised">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule bg-surface-container-low px-5 py-4">
        <div>
          <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Faculty timetable</p>
          <h2 className="mt-1 text-headline-sm text-on-surface">{facultyName}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-data-table text-mono-grey">
          {versionLabel && <span>{versionLabel}</span>}
          {publishedAt && <span>Published {new Date(publishedAt).toLocaleDateString()}</span>}
          <span>Total: {totalPeriods}</span>
          <span>Free: {freePeriods}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[900px]"
          style={{
            gridTemplateColumns: `130px repeat(${periods}, minmax(${compact ? 126 : 154}px, 1fr))`,
            gridTemplateRows: `44px repeat(${days.length}, minmax(${compact ? 98 : 120}px, auto))`,
          }}
        >
          <div className="sticky left-0 z-20 border-b border-r border-rule bg-on-background p-3 text-data-table font-semibold text-paper-raised">
            Day
          </div>
          {Array.from({ length: periods }).map((_, index) => (
            <div key={index} className="border-b border-r border-rule bg-on-background p-3 text-center text-data-table font-semibold text-paper-raised">
              Period {index + 1}
            </div>
          ))}

          {days.map((day, dayIndex) => (
            <div
              key={day}
              className="sticky left-0 z-10 border-b border-r border-rule bg-surface-container-low p-4 text-on-surface-variant"
              style={{ gridColumn: 1, gridRow: dayIndex + 2 }}
            >
              <div className="text-xs font-semibold">{dayLabel(day)}</div>
              <div className="mt-0.5 text-data-table text-mono-grey">Cycle {dayIndex + 1}</div>
            </div>
          ))}

          {days.flatMap((day, dayIndex) => (
            Array.from({ length: periods }).flatMap((_, periodIndex) => {
              const period = periodIndex + 1;
              const key = `${day}:${period}`;
              if (covered.has(key)) return [];
              const slot = slotByStart.get(key);
              const span = slot ? Math.min(slot.duration_periods || 1, periods - period + 1) : 1;
              const style = { gridColumn: `${period + 1} / span ${span}`, gridRow: dayIndex + 2 };

              if (!slot) {
                return (
                  <div key={key} className="min-h-24 border-b border-r border-rule p-2" style={style}>
                    <div className="flex h-full min-h-16 items-center justify-center rounded border border-dashed border-rule/70 text-sm text-mono-grey/60">
                      -
                    </div>
                  </div>
                );
              }

              return (
                <div key={slot.id} className="min-h-24 border-b border-r border-rule p-2" style={style}>
                  <div className="flex h-full flex-col justify-between rounded-lg border border-primary/20 bg-accent-soft p-3 text-on-surface">
                    <div>
                      <div className="text-[12px] font-black text-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                        {subjectCode(slot.subject_name)}
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                        {slot.subject_name || 'Class'}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 border-t border-primary/20 pt-2 text-[11px] text-on-surface-variant">
                      <div className="truncate">{slot.section_name || 'Unassigned section'}</div>
                      <div className="truncate">{slot.room_name || 'Unassigned room'}</div>
                    </div>
                  </div>
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
}
