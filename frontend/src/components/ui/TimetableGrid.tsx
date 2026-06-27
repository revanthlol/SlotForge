import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ScheduledSlot, Teacher, Room, Subject, Section, Organization } from '../../hooks/useApi';
import api from '../../lib/api';

interface TimetableGridProps {
  timetableId: string;
  assignments: ScheduledSlot[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  sections: Section[];
  organization: Organization | null;
  editable: boolean;
  onChanged: () => void;
}

type ViewType = 'section' | 'teacher' | 'room';
type GridOrientation = 'hours-x' | 'days-x';

const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const weekdayLabels: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

function hashHue(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function subjectCode(name?: string) {
  if (!name) return 'SUB';
  const compact = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
  return (compact || name).slice(0, 5).toUpperCase();
}

export default function TimetableGrid({
  timetableId,
  assignments,
  teachers,
  rooms,
  subjects,
  sections,
  organization,
  editable,
}: TimetableGridProps) {
  const [viewType, setViewType] = useState<ViewType>('section');
  const [orientation, setOrientation] = useState<GridOrientation>('hours-x');
  const [selectedId, setSelectedId] = useState<string>('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [localAssignments, setLocalAssignments] = useState<ScheduledSlot[]>(assignments);

  useEffect(() => {
    setLocalAssignments(assignments);
  }, [assignments]);

  const cycleLength = organization?.cycle_length || 5;
  const periodsPerDay = organization?.periods_per_day || 6;
  const isDayOrder = organization?.scheduling_mode === 'day_order';

  const dayValues = Array.from({ length: cycleLength }).map((_, index) => {
    if (isDayOrder) return `Day Order ${roman[index + 1] || index + 1}`;
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`;
  });

  const dayLabels = dayValues.map((day) => {
    if (day.startsWith('Day Order ')) return day.replace('Day Order ', 'Day ');
    return weekdayLabels[day] || day;
  });

  const list = useMemo(() => {
    if (viewType === 'teacher') return teachers.map((teacher) => ({ id: teacher.id, name: teacher.name }));
    if (viewType === 'room') return rooms.map((room) => ({ id: room.id, name: room.name }));
    return sections.map((section) => ({ id: section.id, name: section.name }));
  }, [rooms, sections, teachers, viewType]);

  const activeId = selectedId && list.some((item) => item.id === selectedId)
    ? selectedId
    : list[0]?.id || '';

  const filteredAssignments = useMemo(() => localAssignments.filter((slot) => {
    if (!activeId) return false;
    if (viewType === 'teacher') return slot.teacher_id === activeId;
    if (viewType === 'room') return slot.room_id === activeId;
    return slot.section_id === activeId;
  }), [activeId, localAssignments, viewType]);

  const teacherMap = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher.name])), [teachers]);
  const roomMap = useMemo(() => new Map(rooms.map((room) => [room.id, room.name])), [rooms]);
  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.id, section.name])), [sections]);

  const slotByStart = useMemo(() => {
    const map = new Map<string, ScheduledSlot>();
    filteredAssignments.forEach((slot) => {
      map.set(`${slot.day}:${slot.period}`, slot);
    });
    return map;
  }, [filteredAssignments]);

  const coveredCells = useMemo(() => {
    const set = new Set<string>();
    filteredAssignments.forEach((slot) => {
      const duration = Math.min(slot.duration_periods || 1, periodsPerDay - slot.period + 1);
      for (let offset = 1; offset < duration; offset += 1) {
        set.add(`${slot.day}:${slot.period + offset}`);
      }
    });
    return set;
  }, [filteredAssignments, periodsPerDay]);

  const saveSlot = async (slotId: string, payload: Partial<ScheduledSlot>) => {
    if (pendingSlotId) return;
    const previousAssignments = localAssignments;
    setEditError(null);
    setPendingSlotId(slotId);
    setLocalAssignments((current) => current.map((slot) => (
      slot.id === slotId ? { ...slot, ...payload } : slot
    )));
    try {
      const response = await api.patch(`/timetables/${timetableId}/slots/${slotId}`, payload);
      setLocalAssignments((current) => current.map((slot) => (
        slot.id === slotId ? { ...slot, ...response.data } : slot
      )));
    } catch (err: any) {
      setLocalAssignments(previousAssignments);
      setEditError(err.response?.data?.detail || err.message || 'Could not update timetable slot');
    } finally {
      setPendingSlotId(null);
    }
  };

  const deleteSlot = async (slotId: string) => {
    if (!confirm('Delete this assignment from the draft timetable?')) return;
    const previousAssignments = localAssignments;
    setEditError(null);
    setPendingSlotId(slotId);
    setLocalAssignments((current) => current.filter((slot) => slot.id !== slotId));
    try {
      await api.delete(`/timetables/${timetableId}/slots/${slotId}`);
    } catch (err: any) {
      setLocalAssignments(previousAssignments);
      setEditError(err.response?.data?.detail || err.message || 'Could not delete timetable slot');
    } finally {
      setPendingSlotId(null);
    }
  };

  const onDropCell = (day: string, period: number) => {
    if (!editable || !draggingId || pendingSlotId) return;
    const draggedSlot = localAssignments.find((slot) => slot.id === draggingId);
    if (draggedSlot?.day === day && draggedSlot.period === period) {
      setDraggingId(null);
      return;
    }
    saveSlot(draggingId, { day, period });
    setDraggingId(null);
  };

  const renderSlot = (slot: ScheduledSlot) => {
    const subject = subjectMap.get(slot.subject_id);
    const hue = hashHue(slot.subject_id);
    const duration = Math.min(slot.duration_periods || 1, periodsPerDay - slot.period + 1);
    const isPending = pendingSlotId === slot.id;

    return (
      <div
        key={slot.id}
        draggable={editable && !isPending}
        onDragStart={(event) => {
          if (!editable || isPending) return;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', slot.id);
          setDraggingId(slot.id);
        }}
        onDragEnd={() => setDraggingId(null)}
        className={`group h-full rounded-lg border p-3 shadow-sm transition-all ${
          editable && !isPending ? 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md' : ''
        } ${draggingId === slot.id ? 'opacity-45 ring-2 ring-primary' : ''}`}
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, hsl(${hue} 76% 50%) 46%, var(--color-paper-raised)), color-mix(in srgb, hsl(${hue} 88% 64%) 30%, var(--color-paper-raised)))`,
          borderColor: `hsl(${hue} 70% 52% / 0.72)`,
          color: 'var(--color-on-surface)',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-black tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
              {subjectCode(subject?.name)}
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] font-semibold text-on-surface">
              {subject?.name || 'Unknown Subject'}
            </div>
          </div>
          <span
            className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-black"
            style={{ borderColor: `hsl(${hue} 58% 48% / 0.42)`, background: 'color-mix(in srgb, white 36%, transparent)' }}
          >
            {duration}h
          </span>
        </div>

        <div className="mt-2 grid gap-1 border-t border-rule/50 pt-2 text-[10px] text-on-surface-variant">
          <span className="truncate">{teacherMap.get(slot.teacher_id) || 'Unknown Teacher'}</span>
          <span className="truncate">{roomMap.get(slot.room_id) || 'Unknown Room'}</span>
          {viewType !== 'section' && <span className="truncate">{sectionMap.get(slot.section_id) || 'Unknown Section'}</span>}
        </div>

        {editable && (
          <div className="mt-3 flex flex-wrap items-center gap-1 opacity-90">
            <button
              type="button"
              disabled={isPending}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => saveSlot(slot.id, { duration_periods: duration === 2 ? 1 : 2 })}
              className="rounded border border-rule bg-paper-raised/80 px-2 py-1 text-[10px] font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
            >
              {duration === 2 ? 'Make 1h' : 'Make 2h'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => deleteSlot(slot.id)}
              className="rounded border border-error/20 bg-error-container px-2 py-1 text-[10px] font-semibold text-on-error-container hover:opacity-80 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDropCell = (day: string, period: number, style: CSSProperties) => {
    const isActiveDrop = Boolean(editable && draggingId && !pendingSlotId);

    return (
      <div
        key={`empty-${day}-${period}`}
        onDragOver={(event) => {
          if (isActiveDrop) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDropCell(day, period);
        }}
        className={`min-h-24 border-b border-r border-rule p-2 transition-colors ${
          isActiveDrop ? 'bg-accent-soft/35 hover:bg-accent-soft' : ''
        }`}
        style={style}
      >
        <div className="flex h-full min-h-16 items-center justify-center rounded border border-dashed border-transparent text-xs italic text-mono-grey/40">
          {isActiveDrop ? 'Drop here' : 'Empty'}
        </div>
      </div>
    );
  };

  const renderHoursOnXAxis = () => (
    <div
      className="grid min-w-[1040px]"
      style={{
        gridTemplateColumns: `142px repeat(${periodsPerDay}, minmax(148px, 1fr))`,
        gridTemplateRows: `44px repeat(${cycleLength}, minmax(112px, auto))`,
      }}
    >
      <div className="sticky left-0 z-20 bg-on-background text-paper-raised border-b border-r border-rule p-3 text-data-table font-semibold">
        Day Order
      </div>
      {Array.from({ length: periodsPerDay }).map((_, periodIndex) => (
        <div key={`hour-head-${periodIndex + 1}`} className="bg-on-background text-paper-raised border-b border-r border-rule p-3 text-center text-data-table font-semibold">
          Hour {periodIndex + 1}
        </div>
      ))}

      {dayValues.map((day, dayIndex) => (
        <div
          key={`day-head-${day}`}
          className="sticky left-0 z-10 bg-surface-container-low border-b border-r border-rule p-4 text-data-table text-on-surface-variant"
          style={{ gridColumn: 1, gridRow: dayIndex + 2 }}
        >
          <div className="text-xs font-semibold">{dayLabels[dayIndex]}</div>
          <div className="mt-0.5 text-[10px] font-normal text-mono-grey">Cycle {dayIndex + 1}</div>
        </div>
      ))}

      {dayValues.flatMap((day, dayIndex) => (
        Array.from({ length: periodsPerDay }).flatMap((_, periodIndex) => {
          const period = periodIndex + 1;
          const key = `${day}:${period}`;
          if (coveredCells.has(key)) return [];
          const slot = slotByStart.get(key);
          const span = slot ? Math.min(slot.duration_periods || 1, periodsPerDay - period + 1) : 1;
          const style = {
            gridColumn: `${period + 1} / span ${span}`,
            gridRow: dayIndex + 2,
          };
          if (slot) {
            return (
              <div key={slot.id} className="border-b border-r border-rule p-2 min-h-24" style={style}>
                {renderSlot(slot)}
              </div>
            );
          }
          return renderDropCell(day, period, style);
        })
      ))}
    </div>
  );

  const renderDaysOnXAxis = () => (
    <div
      className="grid min-w-[960px]"
      style={{
        gridTemplateColumns: `142px repeat(${cycleLength}, minmax(180px, 1fr))`,
        gridTemplateRows: `44px repeat(${periodsPerDay}, minmax(96px, auto))`,
      }}
    >
      <div className="sticky left-0 z-20 bg-on-background text-paper-raised border-b border-r border-rule p-3 text-data-table font-semibold">
        Period
      </div>
      {dayLabels.map((label) => (
        <div key={label} className="bg-on-background text-paper-raised border-b border-r border-rule p-3 text-center text-data-table font-semibold">
          {label}
        </div>
      ))}

      {Array.from({ length: periodsPerDay }).map((_, periodIndex) => (
        <div
          key={`period-${periodIndex + 1}`}
          className="sticky left-0 z-10 bg-surface-container-low border-b border-r border-rule p-4 text-data-table text-on-surface-variant"
          style={{ gridColumn: 1, gridRow: periodIndex + 2 }}
        >
          <div className="text-xs font-semibold">P{periodIndex + 1}</div>
          <div className="mt-0.5 text-[10px] font-normal text-mono-grey">Hour {periodIndex + 1}</div>
        </div>
      ))}

      {dayValues.flatMap((day, dayIndex) => (
        Array.from({ length: periodsPerDay }).flatMap((_, periodIndex) => {
          const period = periodIndex + 1;
          const key = `${day}:${period}`;
          if (coveredCells.has(key)) return [];
          const slot = slotByStart.get(key);
          const span = slot ? Math.min(slot.duration_periods || 1, periodsPerDay - period + 1) : 1;
          const style = {
            gridColumn: dayIndex + 2,
            gridRow: `${period + 1} / span ${span}`,
          };
          if (slot) {
            return (
              <div key={slot.id} className="border-b border-r border-rule p-2 min-h-24" style={style}>
                {renderSlot(slot)}
              </div>
            );
          }
          return renderDropCell(day, period, style);
        })
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 p-inset-compact bg-paper-raised border-2 border-rule rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>View Schedule By:</span>
          <div className="flex bg-surface-container p-0.5 rounded-lg border border-rule">
            {(['section', 'teacher', 'room'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setViewType(type);
                  setSelectedId('');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                  viewType === type ? 'bg-paper-raised text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <span className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>Grid:</span>
          <div className="flex bg-surface-container p-0.5 rounded-lg border border-rule">
            <button
              type="button"
              onClick={() => setOrientation('hours-x')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                orientation === 'hours-x' ? 'bg-paper-raised text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Hours x Day Orders
            </button>
            <button
              type="button"
              onClick={() => setOrientation('days-x')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                orientation === 'days-x' ? 'bg-paper-raised text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Days x Hours
            </button>
          </div>

          {editable && (
            <span className="rounded-full border border-primary/20 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Editable Draft
            </span>
          )}
        </div>

        {list.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="schedule-selector" className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>
              Select {viewType}:
            </label>
            <select
              id="schedule-selector"
              value={activeId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="academic-input min-w-[200px] text-sm py-1"
            >
              {list.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-mono-grey italic">No {viewType}s available</p>
        )}
      </div>

      {editError && (
        <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
          {editError}
        </div>
      )}

      <div className="bg-paper-raised border-2 border-rule rounded-xl overflow-x-auto shadow-sm">
        {orientation === 'hours-x' ? renderHoursOnXAxis() : renderDaysOnXAxis()}
      </div>
    </div>
  );
}
